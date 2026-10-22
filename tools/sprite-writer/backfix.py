"""charfix item 12: the back of a town body's head is its hair or hat colour, never skin.

backfix(front, back): front and back are 16x32 RGBA numpy cells of the same body and pose. The skin colour
is read off the front face (the eye rows), and the hair or hat colour off the top of the front head.
Every skin-family pixel in the back view's head box is repainted in the hair or hat colour, and the nape
row gets the hat colour's darker neighbour if there is one."""
import numpy as np
from collections import Counter
INK=(0x14,0x0c,0x10)
def _cols(a):
    return [tuple(int(v) for v in p[:3]) for p in a.reshape(-1,4) if p[3]]
def _lum(c): return 0.299*c[0]+0.587*c[1]+0.114*c[2]
SKINS=[(0xe8,0xb8,0x98),(0xf0,0xc8,0xb0),(0xc0,0x80,0x60),(0x8a,0x58,0x40),(0xec,0xd8,0xcc),(0xd2,0xc0,0xb4)]
def _near(a,b,t=70): return sum(abs(x-y) for x,y in zip(a,b))<t
def backfix(front,back):
    al=front[:,:,3]>0
    ys=np.where(al.any(1))[0]
    if not len(ys): return back,0
    top=int(ys[0])
    # hair or hat: the commonest colour on the top two rows of the head
    hair=Counter(c for c in _cols(front[top:top+2,3:13]) if c!=INK)
    if not hair: return back,0
    h=hair.most_common(1)[0][0]
    if h in SKINS: return back,0          # bald or bare crown: no hair or hat to use
    head=Counter(c for c in _cols(front[top:top+12,4:12]) if c!=INK and c!=h)
    sk=[c for c,_ in head.most_common() if c in SKINS]
    if not sk: return back,0
    skin=sk[0]
    fam={c for c in head if _near(c,skin) and c!=h}|{skin}
    out=back.copy(); n=0
    bys=np.where((back[:,:,3]>0).any(1))[0]
    btop=int(bys[0]) if len(bys) else top
    for y in range(btop,min(32,btop+8)):
        for x in range(3,13):
            p=out[y,x]
            if p[3] and tuple(int(v) for v in p[:3]) in fam:
                out[y,x,:3]=h; n+=1
    return out,n
