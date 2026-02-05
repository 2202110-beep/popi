p='frontend/src/pages/user/Dashboard.jsx'
with open(p,'r',encoding='utf-8') as f:
    lines=f.readlines()
stack=0
max_stack=(0,0)
for i,l in enumerate(lines, start=1):
    for ch in l:
        if ch=='{': stack+=1
        elif ch=='}': stack-=1
    if stack>max_stack[0]: max_stack=(stack,i)
print('Final stack:',stack)
print('Max stack:',max_stack)
print('\nAround max stack line:')
for j in range(max(1,max_stack[1]-5), min(len(lines), max_stack[1]+5)+1):
    print(f'{j:4}: {lines[j-1].rstrip()}')
