import cv2,numpy as np,glob,sys
pat, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv)>3 else 3
fs=sorted(glob.glob(pat)); ims=[]
for f in fs:
    im=cv2.resize(cv2.imread(f),(640,360)); t=float(f.split('_')[-1][:-4]); cv2.putText(im,f"bar {t/(240/float(__import__('os').environ.get('BPM','124'))):.2f}",(8,22),cv2.FONT_HERSHEY_SIMPLEX,0.6,(0,255,255),2); ims.append(im)
while len(ims)%cols: ims.append(np.zeros_like(ims[0]))
cv2.imwrite(out,np.vstack([np.hstack(ims[i:i+cols]) for i in range(0,len(ims),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
