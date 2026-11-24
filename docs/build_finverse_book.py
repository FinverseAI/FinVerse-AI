from pathlib import Path
import re, math
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable

BASE=Path(__file__).resolve().parent
OUT=BASE.parent/'output/pdf/FinVerse_AI_Project_Guide.pdf'
W,H=A4; CW=W-100
NAVY=colors.HexColor('#173445'); TEAL=colors.HexColor('#087F83'); INK=colors.HexColor('#293D49'); MUTED=colors.HexColor('#5C7079'); PALE=colors.HexColor('#EAF4F3'); LINE=colors.HexColor('#D9E4E7')
for name,file in [('Book','segoeui.ttf'),('BookBold','seguisb.ttf')]:pdfmetrics.registerFont(TTFont(name,'C:/Windows/Fonts/'+file))
pdfmetrics.registerFontFamily('Book',normal='Book',bold='BookBold',italic='Book',boldItalic='BookBold')
styles={
 'body':ParagraphStyle('body',fontName='Book',fontSize=10.3,leading=14.6,textColor=INK,spaceAfter=9),
 'h1':ParagraphStyle('h1',fontName='BookBold',fontSize=25,leading=29,textColor=NAVY,spaceAfter=16,keepWithNext=True),
 'h2':ParagraphStyle('h2',fontName='BookBold',fontSize=13,leading=17,textColor=TEAL,spaceBefore=8,spaceAfter=7,keepWithNext=True),
 'h3':ParagraphStyle('h3',fontName='BookBold',fontSize=11,leading=15,textColor=MUTED,spaceAfter=12,keepWithNext=True),
 'cell':ParagraphStyle('cell',fontName='Book',fontSize=9.1,leading=12.4,textColor=INK),
 'th':ParagraphStyle('th',fontName='BookBold',fontSize=9.1,leading=12.4,textColor=colors.white),
 'note':ParagraphStyle('note',fontName='Book',fontSize=10.3,leading=15,textColor=NAVY)
}
def p(s,k='body'):
 s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',escape(s))
 return Paragraph(s,styles[k])
class Architecture(Flowable):
 def __init__(self):super().__init__();self.width=CW;self.height=182
 def draw(self):
  c=self.canv
  def box(x,y,w,h,title,sub):
   c.setFillColor(PALE);c.setStrokeColor(TEAL);c.roundRect(x,y,w,h,6,fill=1,stroke=1)
   c.setFillColor(NAVY);c.setFont('BookBold',9.4);c.drawCentredString(x+w/2,y+h-17,title)
   c.setFont('Book',8.1);c.drawCentredString(x+w/2,y+12,sub)
  def arrow(x,y,xx,yy):
   c.setStrokeColor(TEAL);c.setFillColor(TEAL);c.setLineWidth(1);c.line(x,y,xx,yy)
   a=math.atan2(yy-y,xx-x);q=c.beginPath();q.moveTo(xx,yy);q.lineTo(xx-5*math.cos(a-.5),yy-5*math.sin(a-.5));q.lineTo(xx-5*math.cos(a+.5),yy-5*math.sin(a+.5));q.close();c.drawPath(q,fill=1,stroke=0)
  box(137,137,220,42,'Browser / Next.js website','Forms and dashboard')
  box(0,69,220,45,'Next.js finance routes','Forward requests to NestJS')
  box(275,69,220,45,'Better Auth in Next.js','Google sign-in and session checks')
  box(0,0,220,45,'NestJS + Prisma','Check the request and save records')
  box(275,0,220,45,'PostgreSQL on Neon','Shared account and finance records')
  arrow(195,137,110,114);arrow(300,137,385,114);arrow(110,69,110,45);arrow(385,69,385,45);arrow(220,22,275,22);arrow(220,45,275,69)
  c.setFillColor(MUTED);c.setFont('Book',6.6);c.drawCentredString(246,72,'verify session')
def table(lines):
 rows=[[x.strip() for x in l.strip('|').split('|')] for l in lines]
 rows=[r for r in rows if not all(re.fullmatch('[: -]+',x) for x in r)]
 widths=[CW*.28,CW*.72]
 if rows[0][0]=='In this edition':widths=[CW*.88,CW*.12]
 data=[[p(x,'th' if i==0 else 'cell') for x in r] for i,r in enumerate(rows)]
 t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
 pad=5 if rows[0][0]=='Tool' else 8
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F2F6F7'),colors.white]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),pad),('BOTTOMPADDING',(0,0),(-1,-1),pad),('LINEBELOW',(0,0),(-1,-1),.3,LINE)]))
 return t

def cover(c,doc):
 c.saveState()
 c.setFillColor(NAVY);c.rect(0,0,W,H,fill=1,stroke=0)
 c.setFillColor(TEAL);c.rect(0,0,14,H,fill=1,stroke=0)
 c.setStrokeColor(colors.HexColor('#345563'));c.setLineWidth(.6)
 for inset in [0,23,46]:
  c.roundRect(W-260+inset,90+inset,340,350,24,fill=0,stroke=1)
 c.setFillColor(colors.HexColor('#8DD8CF'));c.setFont('BookBold',10)
 c.drawString(58,H-78,'B.TECH MAJOR PROJECT')
 c.setFillColor(colors.white);c.setFont('BookBold',47);c.drawString(55,H-192,'FinVerse AI')
 c.setFont('Book',24);c.drawString(58,H-236,'The Project Book')
 c.setStrokeColor(colors.HexColor('#66C4BB'));c.setLineWidth(3);c.line(58,H-272,122,H-272)
 c.setFillColor(colors.HexColor('#D7E9EA'));c.setFont('Book',13)
 c.drawString(58,H-310,'Understanding the purpose, technology')
 c.drawString(58,H-331,'and workings of FinVerse.')
 c.setFillColor(colors.HexColor('#8DD8CF'));c.setFont('BookBold',10);c.drawString(58,335,'CHAPTER 01')
 c.setFillColor(colors.white);c.setFont('BookBold',23)
 c.drawString(58,297,'Personal Finance')
 c.drawString(58,266,'Dashboard')
 c.setFont('Book',11);c.setFillColor(colors.HexColor('#C4DBDD'))
 c.drawString(58,225,'Why it exists. What it solves. How it works.')
 c.setStrokeColor(colors.HexColor('#55717B'));c.setLineWidth(.6);c.line(58,141,W-58,141)
 c.setFont('BookBold',10);c.setFillColor(colors.white);c.drawString(58,113,'FINVERSE AI PROJECT DOCUMENTATION')
 c.setFont('Book',10);c.setFillColor(colors.HexColor('#C4DBDD'));c.drawString(58,90,'Edition 2.1  |  November 2026')
 c.bookmarkPage('cover');c.addOutlineEntry('FinVerse AI - The Project Book','cover',0,False)
 c.restoreState()

def page(c,doc):
 c.saveState();c.setFillColor(TEAL);c.rect(0,H-6,W,6,fill=1,stroke=0)
 c.setFillColor(MUTED);c.setFont('BookBold',8);c.drawString(50,H-30,'FINVERSE AI / THE PROJECT BOOK');c.setFont('Book',8);c.drawRightString(W-50,H-30,'18 NOVEMBER 2026')
 c.setStrokeColor(LINE);c.line(50,35,W-50,35);c.setFont('Book',8);c.drawString(50,21,'Module 1 | Edition 2.1');c.drawRightString(W-50,21,str(doc.page));c.restoreState()
class Book(SimpleDocTemplate):
 def afterFlowable(self,f):
  if isinstance(f,Paragraph) and f.style.name=='h1':
   title=f.getPlainText();key='page-'+str(self.page);self.canv.bookmarkPage(key);self.canv.addOutlineEntry(title,key,0,False)

text=(BASE/'finverse-project-book.md').read_text(encoding='utf-8-sig')
sections=re.split(r'\n---\s*\n',text);story=[Spacer(1,1),PageBreak()]
for idx,section in enumerate(sections):
 if idx:story.append(PageBreak())
 lines=section.strip().splitlines();i=0
 while i<len(lines):
  line=lines[i].strip();i+=1
  if not line:continue
  if line.startswith('|'):
   tab=[line]
   while i<len(lines) and lines[i].strip().startswith('|'):tab.append(lines[i].strip());i+=1
   story.extend([table(tab),Spacer(1,11)])
  elif line.startswith('### '):story.append(p(line[4:],'h3'))
  elif line.startswith('## '):story.append(p(line[3:],'h2'))
  elif line.startswith('# '):story.append(p(line[2:],'h1'))
  elif line==':::diagram':story.extend([Architecture(),Spacer(1,12)])
  elif line.startswith('> '):
   t=Table([[p(line[2:],'note')]],colWidths=[CW]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.4,LINE),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),11),('BOTTOMPADDING',(0,0),(-1,-1),11)]));story.extend([t,Spacer(1,10)])
  else:story.append(p(line))
OUT.parent.mkdir(parents=True,exist_ok=True)
Book(str(OUT),pagesize=A4,leftMargin=50,rightMargin=50,topMargin=57,bottomMargin=49,title='FinVerse AI - Project Book - Chapter 1',author='FinVerse AI',subject='Technology stack and Personal Finance Dashboard, Edition 2.1').build(story,onFirstPage=cover,onLaterPages=page)
print(OUT)
