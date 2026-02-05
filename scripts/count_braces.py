import sys
p='frontend/src/pages/user/Dashboard.jsx'
s=open(p,'r',encoding='utf-8').read()
counts={'{':0,'}':0,'(':0,')':0,'[':0,']':0}
for i,ch in enumerate(s):
    if ch in counts: counts[ch]+=1
print('Counts:')
for k in counts: print(k,counts[k])

# find last lines with unbalanced
for idx,line in enumerate(s.splitlines(),start=1):
    # count cumulative
    pass
# show trailing 80 chars of file
print('\nLast 400 chars:\n')
print(s[-400:])
