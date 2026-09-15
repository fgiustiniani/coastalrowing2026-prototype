#!/usr/bin/env python3
"""Genera i PDF dei percorsi usando la mappa grafica ufficiale come base."""

from pathlib import Path
import subprocess

from PIL import Image
from reportlab.lib.colors import HexColor, Color, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
SVG = ROOT / "assets/maps/mappa-campo-gara.svg"
BASE_PNG = ROOT / "tmp/maps/mappa-campo-gara-pdf.png"
BASE_JPG = ROOT / "tmp/maps/mappa-campo-gara-pdf.jpg"
OUTPUT_DIR = ROOT / "assets/documents"

ROUTES = {
    "master": {
        "title": "Master 3 km",
        "detail": "Percorso indicativo - circa 3.015 m",
        "color": "#f57c00",
        "file": "campo-gara-master-3km.pdf",
        "points": [(215.21, 362.85), (616.18, 442.27), (610.94, 212.53), (445.87, 309.67), (215.75, 306.95)],
    },
    "pr3": {
        "title": "PR3 II - circa 1.700 m",
        "detail": "Percorso indicativo - sviluppo KML circa 1.647 m",
        "color": "#26c6da",
        "file": "campo-gara-pr3-ii-1700m.pdf",
        "points": [(218.68, 354.83), (456.62, 399.67), (451.30, 298.17), (215.44, 295.23)],
    },
    "senior": {
        "title": "U19/U23/Senior 6 km",
        "detail": "Percorso indicativo - circa 5.951 m",
        "color": "#ffee58",
        "file": "campo-gara-u19-u23-senior-6km.pdf",
        "points": [(221.49, 374.14), (615.48, 453.08), (815.10, 358.44), (1089.47, 475.70), (1088.67, 206.16), (863.74, 207.84), (600.62, 211.27), (443.78, 304.50), (211.77, 301.27)],
    },
}


def prepare_base_image():
    BASE_PNG.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "inkscape",
            str(SVG),
            "--export-type=png",
            f"--export-filename={BASE_PNG}",
            "--export-width=1200",
        ],
        check=True,
    )
    with Image.open(BASE_PNG) as image:
        image.convert("RGB").save(BASE_JPG, "JPEG", quality=58, optimize=True, progressive=True)


def rounded_badge(pdf, text, right, top, background):
    font_size = 10
    width = stringWidth(text, "Helvetica-Bold", font_size) + 24
    height = 24
    x = right - width
    y = top - height
    pdf.setFillColor(background)
    pdf.roundRect(x, y, width, height, 12, stroke=0, fill=1)
    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", font_size)
    pdf.drawCentredString(x + width / 2, y + 7.5, text)


def draw_pdf(route):
    output = OUTPUT_DIR / route["file"]
    page_w, page_h = landscape(A4)
    pdf = canvas.Canvas(str(output), pagesize=(page_w, page_h), pageCompression=1)
    pdf.setTitle(f"Campo gara Pesaro 2026 - {route['title']}")
    pdf.setAuthor("Societa Canottieri Pesaro")
    pdf.setSubject("Campo gara Campionati Italiani Coastal Rowing 2026")

    navy = HexColor("#00192e")
    teal = HexColor("#0b6b88")
    route_color = HexColor(route["color"])
    pdf.setFillColor(navy)
    pdf.rect(0, 0, page_w, page_h, stroke=0, fill=1)

    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(28, page_h - 32, "Campo gara - Pesaro 2026")
    pdf.setFont("Helvetica", 9.5)
    pdf.setFillColor(HexColor("#c6dce5"))
    pdf.drawString(28, page_h - 48, "Campionati Italiani Coastal Rowing - 3-4 ottobre 2026")
    rounded_badge(pdf, route["title"], page_w - 28, page_h - 20, teal)

    map_x = 28
    map_w = page_w - 56
    map_h = map_w * 9 / 16
    map_y = 72
    pdf.drawImage(str(BASE_JPG), map_x, map_y, width=map_w, height=map_h, preserveAspectRatio=True)

    def page_point(point):
        x, y = point
        return map_x + (x / 1200) * map_w, map_y + map_h - (y / 675) * map_h

    page_points = [page_point(point) for point in route["points"]]
    path = pdf.beginPath()
    path.moveTo(*page_points[0])
    for point in page_points[1:]:
        path.lineTo(*point)

    pdf.setLineCap(1)
    pdf.setLineJoin(1)
    pdf.setStrokeColor(Color(0, 0.08, 0.14, alpha=0.92))
    pdf.setLineWidth(10)
    pdf.drawPath(path, stroke=1, fill=0)
    pdf.setStrokeColor(route_color)
    pdf.setLineWidth(5)
    pdf.drawPath(path, stroke=1, fill=0)

    for x, y in page_points[1:-1]:
        pdf.setFillColor(route_color)
        pdf.setStrokeColor(navy)
        pdf.setLineWidth(2)
        pdf.circle(x, y, 5, stroke=1, fill=1)

    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(28, 50, route["detail"])
    pdf.setFont("Helvetica", 8.5)
    pdf.setFillColor(HexColor("#c6dce5"))
    pdf.drawString(28, 34, "Schema indicativo. Le coordinate WGS84 delle boe sono disponibili nella pagina Campo gara del sito.")
    pdf.drawRightString(page_w - 28, 34, "societacanottieripesaro.com")

    pdf.showPage()
    pdf.save()
    return output


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    prepare_base_image()
    for route in ROUTES.values():
        print(draw_pdf(route))


if __name__ == "__main__":
    main()
