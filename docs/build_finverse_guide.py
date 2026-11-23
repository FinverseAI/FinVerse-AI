"""Rebuild the living FinVerse guide from Markdown.

Usage: python docs/build_finverse_guide.py --output PATH
Requires reportlab. Optional QA rendering uses pdftoppm outside this script.
Chapter breaks are Markdown horizontal rules. The architecture directive is
drawn with ReportLab vectors so it remains sharp at any zoom level.
"""
from pathlib import Path
import argparse
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table,
    TableStyle, PageBreak, Flowable, KeepTogether,
)

ROOT = Path(__file__).resolve().parent
NAVY = colors.HexColor('#142D40')
TEAL = colors.HexColor('#087F83')
INK = colors.HexColor('#263B4B')
MUTED = colors.HexColor('#576C7B')
PALE = colors.HexColor('#EAF5F3')
LINE = colors.HexColor('#D7E2E6')
PAPER = colors.HexColor('#F5F8FA')
W, H = A4
MARGIN = 48
CONTENT = W - 2 * MARGIN

font_root = Path('C:/Windows/Fonts')
if (font_root / 'segoeui.ttf').exists():
    pdfmetrics.registerFont(TTFont('Guide', str(font_root / 'segoeui.ttf')))
    pdfmetrics.registerFont(TTFont('GuideBold', str(font_root / 'seguisb.ttf')))
    pdfmetrics.registerFont(TTFont('GuideItalic', str(font_root / 'segoeuii.ttf')))
    pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='GuideBold', italic='GuideItalic', boldItalic='GuideBold')
    REG, BOLD = 'Guide', 'GuideBold'
else:
    REG, BOLD = 'Helvetica', 'Helvetica-Bold'

styles = {
    'body': ParagraphStyle('body', fontName=REG, fontSize=9.6, leading=13.5, textColor=INK, spaceAfter=9),
    'h1': ParagraphStyle('h1', fontName=BOLD, fontSize=22, leading=27, textColor=NAVY, spaceAfter=17, keepWithNext=True),
    'h2': ParagraphStyle('h2', fontName=BOLD, fontSize=12.5, leading=16, textColor=TEAL, spaceBefore=8, spaceAfter=7, keepWithNext=True),
    'cell': ParagraphStyle('cell', fontName=REG, fontSize=8.6, leading=11.6, textColor=INK, spaceAfter=0),
    'th': ParagraphStyle('th', fontName=BOLD, fontSize=8.8, leading=11.6, textColor=colors.white),
    'note': ParagraphStyle('note', fontName=REG, fontSize=10, leading=14.5, textColor=NAVY),
}


def markup(s):
    s = escape(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    return s


def para(s, key='body'):
    return Paragraph(markup(s), styles[key])


class Architecture(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = CONTENT, 268

    def draw(self):
        c = self.canv
        def box(x, y, w, h, title, sub, dashed=False):
            c.setFillColor(PAPER if dashed else PALE)
            c.setStrokeColor(MUTED if dashed else TEAL)
            c.setDash(3, 3) if dashed else c.setDash()
            c.roundRect(x, y, w, h, 7, fill=1, stroke=1)
            c.setDash()
            c.setFillColor(NAVY)
            c.setFont(BOLD, 10)
            c.drawCentredString(x+w/2, y+h-(13 if dashed else 19), title)
            c.setFont(REG, 8.2)
            c.drawCentredString(x+w/2, y+(10 if dashed else 13), sub)
        def arrow(x1, y1, x2, y2):
            import math
            c.setStrokeColor(TEAL)
            c.setLineWidth(1.2)
            c.line(x1, y1, x2, y2)
            a = math.atan2(y2-y1, x2-x1)
            p = c.beginPath()
            p.moveTo(x2, y2)
            p.lineTo(x2-6*math.cos(a-.5), y2-6*math.sin(a-.5))
            p.lineTo(x2-6*math.cos(a+.5), y2-6*math.sin(a+.5))
            p.close()
            c.setFillColor(TEAL)
            c.drawPath(p, fill=1, stroke=0)
        box(119, 219, 260, 45, 'Browser: FinVerse website', 'Screens and forms used by the person')
        box(0, 137, 222, 53, 'Next.js finance routes', 'Forward profile, goal and activity requests')
        box(277, 137, 222, 53, 'Next.js + Better Auth', 'Google sign-in and session verification')
        arrow(190, 219, 111, 190)
        arrow(310, 219, 388, 190)
        box(0, 54, 222, 53, 'NestJS + Prisma', 'Validate finance records and access data')
        box(277, 54, 222, 53, 'PostgreSQL', 'Shared sign-in and personal-finance tables')
        arrow(111, 137, 111, 107)
        arrow(388, 137, 388, 107)
        arrow(222, 80, 277, 80)
        arrow(222, 107, 277, 137)
        c.setFillColor(MUTED)
        c.setFont(REG, 7.3)
        c.drawCentredString(249, 96, 'session check')
        box(0, 0, 222, 39, 'Redis: configured only', 'No application connection found', True)
        box(277, 0, 222, 39, 'Python / AI: planned', 'No implemented service or connection', True)


class StorageMap(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = CONTENT, 230

    def draw(self):
        c = self.canv
        c.setStrokeColor(TEAL)
        c.setLineWidth(1.1)
        c.line(249, 183, 249, 153)
        c.line(80, 153, 419, 153)
        for x in [80, 249, 419]:
            c.line(x, 153, x, 139)
            c.line(x, 76, x, 62)
        for x,y,w,h,title,sub in [
            (146,183,206,43,'User','One account identity'),
            (0,76,160,63,'Sign-in records','Sessions and provider accounts'),
            (170,76,160,63,'Financial profile','One saved plan per user'),
            (340,76,159,63,'Activity and goals','Many records per user'),
            (0,4,160,58,'Used for access','Who is signed in?'),
            (170,4,160,58,'Used for planning','Income, savings, budget split'),
            (340,4,159,58,'Used for tracking','Expenses, income, bills, goals'),
        ]:
            c.setFillColor(PALE if y > 62 else PAPER)
            c.roundRect(x,y,w,h,6,fill=1,stroke=1)
            c.setFillColor(NAVY); c.setFont(BOLD,9.5)
            c.drawCentredString(x+w/2,y+h-18,title)
            c.setFont(REG,7.9)
            c.drawCentredString(x+w/2,y+13,sub)


class Cover(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = CONTENT, 700

    def draw(self):
        c = self.canv
        c.setFillColor(TEAL)
        c.roundRect(0, 653, 130, 25, 4, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont(BOLD, 9)
        c.drawString(12, 662, 'THE LIVING PROJECT GUIDE')
        c.setFillColor(NAVY)
        c.setFont(BOLD, 49)
        c.drawString(0, 563, 'FinVerse AI')
        c.setFont(REG, 26)
        c.drawString(0, 517, 'The project, explained')
        p = Paragraph('What exists. How it works.<br/>What the team is building next.', ParagraphStyle('coverlead', fontName=REG, fontSize=17, leading=25, textColor=MUTED))
        p.wrapOn(c, CONTENT, 100)
        p.drawOn(c, 0, 440)
        # Two modules, with status in text rather than color alone.
        for x, title, status, desc in [
            (0, '01  Personal finance', 'IMPLEMENTED FOUNDATION', 'Profiles, goals, transactions,<br/>bills and spending analysis'),
            (257, '02  Stock intelligence', 'IMPLEMENTED MODULE', 'Markets, company research,<br/>portfolio analysis and AI'),
        ]:
            c.setFillColor(PALE if x == 0 else PAPER)
            c.roundRect(x, 271, 242, 125, 9, fill=1, stroke=0)
            c.setFillColor(TEAL if x == 0 else MUTED)
            c.setFont(BOLD, 8)
            c.drawString(x+16, 374, status)
            c.setFillColor(NAVY)
            c.setFont(BOLD, 13)
            c.drawString(x+16, 347, title)
            p = Paragraph(desc, ParagraphStyle('mod', fontName=REG, fontSize=10.5, leading=15.5, textColor=INK))
            p.wrapOn(c, 210, 60)
            p.drawOn(c, x+16, 294)
        c.setStrokeColor(LINE)
        c.line(0, 231, CONTENT, 231)
        c.setFillColor(NAVY)
        c.setFont(BOLD, 12)
        c.drawString(0, 203, 'B.Tech major project  |  Edition 1.2')
        c.setFont(REG, 11)
        c.drawString(0, 180, 'Reviewed 23 November 2026')
        p = Paragraph('For teachers, friends, recruiters and new teammates.<br/><br/>Based on the current working copy and project planning documents. Implemented code, partial features and future plans are distinguished throughout. Live deployment and complete end-to-end operation are not claimed.', ParagraphStyle('coversmall', fontName=REG, fontSize=10, leading=15, textColor=MUTED))
        _, ph = p.wrapOn(c, 460, 140)
        p.drawOn(c, 0, 140-ph)


class GuideDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
            topMargin=54, bottomMargin=45, title='FinVerse AI - The Project, Explained',
            author='FinVerse AI project documentation', subject='Living project guide, Edition 1.2, 23 November 2026')
        self.section = 'FinVerse AI'
        self.section_pages = []
        frame = Frame(MARGIN, 45, CONTENT, H-99, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates(PageTemplate(id='guide', frames=[frame], onPage=self.decorate))

    def decorate(self, c, doc):
        c.saveState()
        if doc.page > 1:
            c.setFillColor(TEAL)
            c.rect(0, H-7, W, 7, fill=1, stroke=0)
            c.setFont(BOLD, 8)
            c.setFillColor(NAVY)
            c.drawString(MARGIN, H-31, 'FINVERSE AI / PROJECT GUIDE')
            c.setFont(REG, 8)
            c.setFillColor(MUTED)
            c.drawRightString(W-MARGIN, H-31, 'EDITION 1.2 / 23 NOV 2026')
        c.setStrokeColor(LINE)
        c.line(MARGIN, 32, W-MARGIN, 32)
        c.setFont(REG, 7.8)
        c.setFillColor(MUTED)
        c.drawString(MARGIN, 19, 'Source-grounded snapshot | Built, partial and planned are labelled')
        c.setFont(BOLD, 8)
        c.drawRightString(W-MARGIN, 19, f'{doc.page:02d}')
        c.restoreState()

    def afterFlowable(self, item):
        if isinstance(item, Paragraph) and item.style.name == 'h1':
            label = item.getPlainText()
            key = 'section-' + label.split('|')[0].strip()
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(label, key, level=0, closed=False)
            self.section_pages.append((label, self.page))


def table(lines):
    rows = [[v.strip() for v in line.strip().strip('|').split('|')] for line in lines]
    cols = len(rows[0])
    # CommonMark divider rows are permitted but not needed by this source.
    rows = [r for r in rows if not all(re.fullmatch(r'[:\- ]+', v or ' ') for v in r)]
    if cols == 2:
        widths = [CONTENT*.285, CONTENT*.715]
        if rows[0][0] == 'Key':
            widths = [CONTENT*.085, CONTENT*.915]
        elif rows[0][0] == 'Chapter':
            widths = [CONTENT*.88, CONTENT*.12]
    else:
        widths = [CONTENT*.265, CONTENT*.235, CONTENT*.50]
        if rows[0][0] == 'Module':
            widths = [CONTENT*.27, CONTENT*.40, CONTENT*.33]
        elif rows[0][0] == 'Edition':
            widths = [CONTENT*.12, CONTENT*.25, CONTENT*.63]
        elif rows[0][0] == 'Record':
            widths = [CONTENT*.25, CONTENT*.43, CONTENT*.32]
    data = [[para(cell, 'th' if i == 0 else 'cell') for cell in row] for i, row in enumerate(rows)]
    obj = Table(data, colWidths=widths, repeatRows=1, hAlign='LEFT')
    obj.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), NAVY),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [PAPER, colors.white]),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 9),
        ('RIGHTPADDING', (0,0), (-1,-1), 9),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,0), .5, NAVY),
        ('LINEBELOW', (0,1), (-1,-1), .3, LINE),
    ]))
    if rows[0][0] == 'Tool or package':
        obj.setStyle(TableStyle([
            ('TOPPADDING', (0,0), (-1,-1), 4.3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4.3),
        ]))
    return [obj, Spacer(1, 10)]


def chapter(text):
    flow = []
    lines = text.strip().splitlines()
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        if not s:
            i += 1
            continue
        if s.startswith('|'):
            tab = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                tab.append(lines[i]); i += 1
            flow.extend(table(tab))
            continue
        if s.startswith('# '):
            flow.append(para(s[2:], 'h1'))
        elif s.startswith('## '):
            flow.append(para(s[3:], 'h2'))
        elif s == ':::diagram architecture':
            flow.extend([Architecture(), Spacer(1, 12)])
        elif s == ':::diagram storage':
            flow.extend([StorageMap(), Spacer(1, 15)])
        elif s.startswith('> '):
            note = Table([[para(s[2:], 'note')]], colWidths=[CONTENT])
            note.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.5,LINE),('LEFTPADDING',(0,0),(-1,-1),13),('RIGHTPADDING',(0,0),(-1,-1),13),('TOPPADDING',(0,0),(-1,-1),11),('BOTTOMPADDING',(0,0),(-1,-1),11)]))
            flow.extend([note, Spacer(1, 11)])
        else:
            flow.append(para(s))
        i += 1
    return flow


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--output', default=str(ROOT.parent/'output/pdf/FinVerse_AI_Project_Guide.pdf'))
    args = p.parse_args()
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    sections = re.split(r'\n---\s*\n', (ROOT/'finverse-project-guide.md').read_text(encoding='utf-8'))
    story = [Cover(), PageBreak(), para('Contents', 'h1'),
        para('Read from the beginning for the full story, or use a chapter below. The PDF bookmarks also let you jump between sections.')]
    titles = [re.search(r'^# (.+)', section.strip(), re.M).group(1) for section in sections[1:]]
    contents_lines = ['| Chapter | Page |', '| --- | --- |']
    contents_lines += [f'| {title.replace("|", " / ")} | {i+3} |' for i, title in enumerate(titles)]
    story.extend(table(contents_lines))
    story.extend([para('A guide that grows with the project', 'h2'),
        para('Each chapter starts on a fresh page. Chapter numbers stay stable when pages are added. Section 16 contains the update template and edition history.'),
        para('Snapshot: 23 November 2026. Implemented means code exists; it does not mean the feature has been deployed or independently tested with live services.')])
    for section in sections[1:]:
        story.append(PageBreak())
        story.extend(chapter(section))
    doc = GuideDoc(str(output))
    doc.build(story)
    for title, page in doc.section_pages:
        print(f'{page:02d} {title}')
    print(f'PDF: {output}')


if __name__ == '__main__':
    main()
