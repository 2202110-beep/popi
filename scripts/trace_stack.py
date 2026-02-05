p='frontend/src/pages/user/Dashboard.jsx'
lines=open(p,'r',encoding='utf-8').read().splitlines()
stack=0
for i,l in enumerate(lines, start=1):
    for ch in l:
        if ch=='{': stack+=1
        elif ch=='}': stack-=1
    if i%20==0 or stack>0 and stack<4:
        print(f'{i:4} stack={stack} | {l[:200]}')
# show last 60 lines
print('\nLast 60 lines:')
for j in range(max(1,len(lines)-60), len(lines)+1):
    print(f'{j:4}: {lines[j-1]}')
print('\nFinal stack:',stack)
