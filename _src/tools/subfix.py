# Jelölések alsó indexbe tétele a videók szöveg-literáljaiban: Hd → H_d, Rp;d → R_{p;d} …
import re, sys
MAP = [
 ("φ′cv;k","φ′_{cv;k}"),("φ′cv","φ′_{cv}"),("φ′k","φ′_k"),("φ′d","φ′_d"),("c′k","c′_k"),("c′d","c′_d"),
 ("V′k","V′_k"),("V'k","V′_k"),("H′d","H′_d"),
 ("Rp;d","R_{p;d}"),("Mdst;d","M_{dst;d}"),("Mstb;d","M_{stb;d}"),("Mdst","M_{dst}"),("Mstb","M_{stb}"),
 ("Vdst;d","V_{dst;d}"),("Gstb;d","G_{stb;d}"),("Gsz;d","G_{sz;d}"),("Gt;d","G_{t;d}"),("Vdst","V_{dst}"),("Gstb","G_{stb}"),
 ("γG;dst","γ_{G;dst}"),("γG;stb","γ_{G;stb}"),("γQ;dst","γ_{Q;dst}"),("γQ;stb","γ_{Q;stb}"),
 ("γR;h","γ_{R;h}"),("γR;e","γ_{R;e}"),("γR;v","γ_{R;v}"),("γs;t","γ_{s;t}"),("γcu","γ_{cu}"),
 ("γG","γ_G"),("γQ","γ_Q"),("γR","γ_R"),("γφ","γ_φ"),("γc","γ_c"),("γw","γ_w"),("γa","γ_a"),("γM","γ_M"),
 ("cu;k","c_{u;k}"),("Ea,q","E_{a,q}"),("Ep,max","E_{p,max}"),("Fw;k","F_{w;k}"),("Fw,k","F_{w,k}"),("σmax","σ_{max}"),("σ max","σ_{max}"),
 ("Hd","H_d"),("Rd","R_d"),("Vd","V_d"),("Vk","V_k"),("Mk","M_k"),("Gk","G_k"),("Qk","Q_k"),("Ac","A_c"),("Ak","A_k"),
 ("Ed","E_d"),("Ea","E_a"),("Ep","E_p"),("Ka","K_a"),("Kp","K_p"),("Td","T_d"),("Pd","P_d"),("Rk","R_k"),("Fd","F_d"),
 ("wk","w_k"),("ru","r_u"),("δk","δ_k"),("cu","c_u"),("kF","k_F"),
]
L = 'A-Za-zÀ-žΑ-ωϕ0-9_{}'
RX = [(re.compile(r'(?<![%s])%s(?![%s])' % (L, re.escape(a), L)), b) for a, b in MAP]
def fix_text(t):
    for rx, b in RX: t = rx.sub(lambda m: b, t)
    return t
def fix_src(src):
    out = []; i = 0; n = len(src)
    while i < n:
        ch = src[i]
        if ch == '/' and i + 1 < n and src[i+1] == '/':
            j = src.find('\n', i); j = n if j < 0 else j; out.append(src[i:j]); i = j; continue
        if ch == '/' and i + 1 < n and src[i+1] == '*':
            j = src.find('*/', i + 2); j = n if j < 0 else j + 2; out.append(src[i:j]); i = j; continue
        if ch in "'\"`":
            q = ch; j = i + 1; buf = []
            while j < n and src[j] != q:
                if src[j] == '\\': buf.append(src[j:j+2]); j += 2; continue
                if q == '`' and src[j:j+2] == '${':
                    k = src.find('}', j); buf.append(('CODE', src[j:k+1])); j = k + 1; continue
                buf.append(src[j]); j += 1
            # összefűzés: a kód-részeket érintetlenül hagyjuk
            res = []; cur = ''
            for b in buf:
                if isinstance(b, tuple): res.append(fix_text(cur)); res.append(b[1]); cur = ''
                else: cur += b
            res.append(fix_text(cur))
            out.append(q + ''.join(res) + q); i = j + 1; continue
        out.append(ch); i += 1
    return ''.join(out)
if __name__ == '__main__':
    for f in sys.argv[1:]:
        s = open(f).read(); t = fix_src(s)
        if t != s: open(f, 'w').write(t)
        print(f, sum(1 for a, b in zip(s.splitlines(), t.splitlines()) if a != b), 'sor módosult')
