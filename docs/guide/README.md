# Guide to the documentation (PDF)

[`ThotsakanStatistics-Guide.pdf`](ThotsakanStatistics-Guide.pdf) explains, for people rather than tools, what
each document holds, how the app is built and how to work on it. It is a snapshot (the date is on the cover);
when it and the other documents disagree, the documents win.

Rebuild it after the documents change (needs TeX Live with XeLaTeX and the Segoe UI, Tahoma and Consolas
fonts, as on Windows):

```bash
cd docs/guide
xelatex ThotsakanStatistics-Guide.tex && xelatex ThotsakanStatistics-Guide.tex
```
