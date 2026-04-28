import re

with open('original_index.css', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract from line 220 onwards (where .glass-panel, .page-enter, .page-panel logic starts)
# Actually, wait, let's extract from line 327 where .page-panel > .ant-card starts
start_idx = 0
for i, line in enumerate(lines):
    if '.page-panel > .ant-card' in line:
        start_idx = i
        break

structural_css = "".join(lines[start_idx:])

# Make it premium SaaS looking
structural_css = structural_css.replace('rgba(255, 255, 255, 0.7)', 'var(--ui-surface)')
structural_css = structural_css.replace('rgba(255, 255, 255, 0.68)', 'var(--ui-surface)')
structural_css = structural_css.replace('0 24px 70px rgba(15, 23, 42, 0.09)', 'var(--ui-shadow-glass)')
structural_css = structural_css.replace('rgba(15, 23, 42, 0.08)', 'var(--ui-border)')
structural_css = structural_css.replace('rgba(15, 23, 42, 0.1)', 'var(--ui-border)')
structural_css = structural_css.replace('rgba(15, 23, 42, 0.12)', 'var(--ui-border)')
structural_css = structural_css.replace('rgba(15, 23, 42, 0.14)', 'var(--ui-border)')
structural_css = structural_css.replace('border-radius: 10px', 'border-radius: var(--ui-radius-sm)')
structural_css = structural_css.replace('border-radius: 12px', 'border-radius: var(--ui-radius-md)')
structural_css = structural_css.replace('border-radius: 14px', 'border-radius: var(--ui-radius-lg)')
structural_css = structural_css.replace('border-radius: 20px', 'border-radius: var(--ui-radius-lg)')
structural_css = structural_css.replace('background: #fbfdff', 'background: var(--ui-surface-elevated)')
structural_css = structural_css.replace('background: #f8fbff', 'background: var(--ui-surface-elevated)')
structural_css = structural_css.replace('color: #1d4ed8', 'color: var(--ui-accent)')
structural_css = structural_css.replace('border-color: #0b65f1', 'border-color: var(--ui-accent)')
structural_css = structural_css.replace('background: rgba(11, 101, 241, 0.08)', 'background: var(--ui-accent-soft)')
structural_css = structural_css.replace('background: rgba(11, 101, 241, 0.06)', 'background: var(--ui-accent-soft)')
structural_css = structural_css.replace('#0b57d0', 'var(--ui-accent)')

with open('index.css', 'r', encoding='utf-8') as f:
    current_css = f.read()

# Merge
with open('index.css', 'w', encoding='utf-8') as f:
    f.write(current_css + "\n\n/* RESTORED AND MODERNIZED STRUCTURAL CSS */\n" + structural_css)

print("Merged CSS successfully")
