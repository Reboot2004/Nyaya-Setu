"""Probe ai4bharat/samanantar structure (streaming, no full download)."""
from datasets import load_dataset

for cfg in ['hi', 'te']:
    print('=== config:', cfg)
    ds = load_dataset('ai4bharat/samanantar', cfg, split='train', streaming=True)
    for i, row in enumerate(ds):
        print(list(row.keys()), {k: str(v)[:90] for k, v in row.items()})
        if i >= 2:
            break
