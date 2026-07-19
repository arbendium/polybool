D
|
|
G
|\
| \
|  \
E   F

axb = (Bx - Ax) * (Dy - Ay) - (By - Ay) * (Dx - Ax)
^ should be 0 but quite isn't

-----

axb = (Cx - Dx) * (By - Ay) - (Cy - Dy) * (Bx - Ax)
shitA = (Bx - Ax) * (Dy - Ay) - (By - Ay) * (Dx - Ax);
#shitB = (Cx - Dx) * (Dy - Ay) - (Cy - Dy) * (Dx - Ax);

Px = Dx + (Cx - Dx) * shitA / axb
Py = Dy + (Cy - Dy) * shitA / axb
^ is D but should not be

---

A = (652307.36,6500592.72)
B = (652311.94,6500561.67)
C = (652340,6500540)
D = (652309.9703942318,6500575.022895)
