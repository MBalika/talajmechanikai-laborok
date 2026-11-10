import cv2, glob, numpy as np, sys
pat, out = sys.argv[1], sys.argv[2]; per = int(sys.argv[3]) if len(sys.argv) > 3 else 9
fs = sorted(glob.glob(pat)); ims = [cv2.resize(cv2.imread(f), (640, 360)) for f in fs]
for i, f in enumerate(fs): cv2.putText(ims[i], f.split('_')[-1][:-4], (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
for k in range(0, len(ims), per):
    ch = ims[k:k + per]
    while len(ch) % 3: ch.append(np.zeros_like(ims[0]))
    cv2.imwrite(out.replace('.jpg', f'_{k // per}.jpg'), np.vstack([np.hstack(ch[i:i + 3]) for i in range(0, len(ch), 3)]), [cv2.IMWRITE_JPEG_QUALITY, 80])
