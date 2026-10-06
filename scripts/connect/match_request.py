#!/usr/bin/env python3
"""Curator-side matching for "Request an introduction" (Claim & Connect, 2026-10-06).

Runs locally on the curator's machine. Reads the public dataset only
(src/data/sdl_data.json); request details stay in the curator's mailbox and,
with --log, in a private JSONL file outside the repo. Nothing here is published.

Ranking (transparent, every score comes with its reasons):
  text      keyword overlap between the request and each entry's name, blurb,
            domain and scale, IDF-weighted over the dataset          (0..1) x 0.45
  offers    the purpose matches what the entry says it offers           +0.25
  maturity  access/software requests favour operational or industrial   +0.10
  place     same country +0.10, same region (EU/Europe) +0.05
  claimed   entry maintained with its lab (more likely to answer)       +0.05
The named target, if any, always stays first. --llm asks the claude CLI to
rerank the top candidates against the same criteria and to say why.

  python3 scripts/connect/match_request.py --purpose access \
      --text "battery electrolyte screening, autonomous cycling for 3 months" \
      --country Germany [--target atinary] [--top 3] [--llm] [--log]
  python3 scripts/connect/match_request.py --pairs     # complementary seeks <-> offers
"""
import argparse, collections, datetime, json, math, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'src', 'data', 'sdl_data.json')
LOG = os.path.expanduser('~/.local/share/sdl-map/intro-requests.jsonl')   # private, never in the repo

PURPOSE_OFFER = {'collab': 'collaboration', 'access': 'lab-access', 'software': 'software',
                 'data': 'data', 'consortium': 'collaboration', 'other': None}
EUROPE = {'Austria', 'Belgium', 'Czechia', 'Denmark', 'EU', 'Finland', 'France', 'Germany', 'Greece', 'Ireland',
          'Italy', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Spain', 'Sweden', 'Switzerland', 'UK',
          'United Kingdom'}
STOP = set('a an and are as at be by for from has have in into is it its of on or that the this to with we our for'.split())


def toks(s):
    return [w for w in re.findall(r'[a-z0-9][a-z0-9\-+]*', (s or '').lower()) if w not in STOP and len(w) > 2]


def doc(e):
    return ' '.join([e.get('name', ''), e.get('blurb', ''), e.get('domain', ''), str(e.get('scale', '')),
                     e.get('charact', ''), ' '.join((e.get('open') or {}).get('offers', []))])


def rank(data, purpose, text, country, target, top):
    docs = {e['id']: collections.Counter(toks(doc(e))) for e in data}
    df = collections.Counter(w for c in docs.values() for w in c)
    n = len(data)
    idf = {w: math.log((n + 1) / (df[w] + 0.5)) for w in df}
    q = set(toks(text))
    qmax = sum(idf.get(w, 0) for w in q) or 1.0
    out = []
    for e in data:
        reasons, score = [], 0.0
        hit = [w for w in q if w in docs[e['id']]]
        t = sum(idf.get(w, 0) for w in hit) / qmax
        if hit:
            reasons.append('mentions ' + ', '.join(sorted(hit, key=lambda w: -idf.get(w, 0))[:4]))
        score += 0.45 * t
        offers = (e.get('open') or {}).get('offers', [])
        want = PURPOSE_OFFER.get(purpose)
        if want and want in offers:
            score += 0.25; reasons.append('offers ' + want)
        if purpose in ('access', 'software') and e.get('maturity') in ('operational', 'industrial'):
            score += 0.10; reasons.append(e['maturity'])
        if country and e.get('country') == country:
            score += 0.10; reasons.append('same country')
        elif country in EUROPE and e.get('country') in EUROPE:
            score += 0.05; reasons.append('Europe')
        if e.get('claimed'):
            score += 0.05; reasons.append('maintained with the lab')
        out.append((score, e, reasons))
    out.sort(key=lambda x: -x[0])
    if target:
        out.sort(key=lambda x: 0 if x[1]['id'] == target else 1)
    return out[:top]


def llm_rerank(cands, purpose, text):
    if not shutil.which('claude'):
        print('  (--llm skipped: claude CLI not found)'); return None
    rows = '\n'.join(f"- {e['id']}: {e['name']} ({e['city']}, {e['country']}; {e['tier']}, {e['domain']}, "
                     f"{e['maturity']}; offers={(e.get('open') or {}).get('offers', [])}) :: {e.get('blurb', '')}"
                     for _, e, _ in cands)
    prompt = ("You help a curator of a public map of self-driving labs decide whom to introduce. "
              f"Request purpose: {purpose}. Request: {text}\n\nCandidates:\n{rows}\n\n"
              "Rank the three best candidates on: what the requester seeks vs what the entry offers; domain and "
              "technique fit; maturity fit; geography and EU-call eligibility. Use only the facts given. "
              "Answer as lines 'id | one-sentence reason'.")
    try:
        r = subprocess.run(['claude', '-p', prompt], capture_output=True, text=True, timeout=120)
        return r.stdout.strip()
    except Exception as ex:
        return f'(--llm failed: {ex})'


def pairs(data):
    seekers = [(e, set((e.get('open') or {}).get('seeks', []))) for e in data]
    map_ = {'academic-partners': lambda e: e['tier'] in ('academic', 'national'),
            'industry-partners': lambda e: e['tier'] in ('commercial', 'labos'),
            'software': lambda e: 'software' in (e.get('open') or {}).get('offers', []),
            'datasets': lambda e: 'data' in (e.get('open') or {}).get('offers', []),
            'use-cases': lambda e: 'collaboration' in (e.get('open') or {}).get('offers', [])}
    found = 0
    for s, wants in seekers:
        for w in sorted(wants):
            fn = map_.get(w)
            if not fn: continue
            for o in data:
                if o['id'] != s['id'] and (o.get('open') or {}).get('offers') and fn(o):
                    print(f"  {s['name']}  seeks {w:<18} <->  {o['name']} ({o['country']})"); found += 1
    if not found:
        print('  no complementary pairs yet: entries have not stated offers and seeks')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--purpose', choices=sorted(PURPOSE_OFFER), default='other')
    ap.add_argument('--text', default='')
    ap.add_argument('--country', default='')
    ap.add_argument('--target', default='')
    ap.add_argument('--top', type=int, default=3)
    ap.add_argument('--llm', action='store_true')
    ap.add_argument('--log', action='store_true', help='append to the private request log (outside the repo)')
    ap.add_argument('--pairs', action='store_true')
    a = ap.parse_args()
    data = json.load(open(DATA))
    if a.pairs:
        pairs(data); return
    if not a.text and not a.target:
        ap.error('give --text and/or --target')
    cands = rank(data, a.purpose, a.text, a.country, a.target, max(a.top, 8 if a.llm else a.top))
    print(f"request · purpose {a.purpose} · {a.country or 'country n/a'}\n")
    for i, (s, e, why) in enumerate(cands[:a.top], 1):
        tag = '  (named target)' if e['id'] == a.target else ''
        print(f" {i}  {e['name']} · {e['city']}, {e['country']}  {s:.2f}{tag}\n    {'; '.join(why) or 'weak match'}")
    if a.llm:
        print('\nLLM rerank:\n' + (llm_rerank(cands, a.purpose, a.text) or ''))
    if a.log:
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        with open(LOG, 'a') as f:
            f.write(json.dumps({'date': datetime.date.today().isoformat(), 'purpose': a.purpose,
                                'country': a.country, 'target': a.target,
                                'suggested': [e['id'] for _, e, _ in cands[:a.top]], 'outcome': 'open'}) + '\n')
        print(f'\nlogged to {LOG}')
    print('\nNext: ask the target first (double opt-in); introduce both only on yes.')


if __name__ == '__main__':
    main()
