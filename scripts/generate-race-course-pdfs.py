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

BUOYS = {
    "1": ("Boa 1", 43.92507837794537, 12.91178571531418),
    "2": ("Boa 2", 43.91766070533492, 12.92103361027470),
    "3": ("Boa 3", 43.91545809289805, 12.92850608896370),
    "4": ("Boa 4", 43.90851386216023, 12.93205797204911),
    "5": ("Boa 5", 43.91315207107629, 12.93879039896511),
    "6": ("Boa 6", 43.92151183862977, 12.92638464970508),
    "7": ("Boa 7", 43.92279427577850, 12.92019546296618),
    "8": ("Boa 8", 43.92730915081520, 12.91468305031462),
    "2B": ("Boa 2B", 43.92118227316204, 12.91813496578632),
    "reference": ("Riferimento partenza/arrivo", 43.92624205850774, 12.91334189037056),
}

ROUTES = {
    "master": {
        "title": "Master 3 km",
        "detail": "Percorso indicativo - circa 3.015 m",
        "color": "#f57c00",
        "file": "campo-gara-master-3km.pdf",
        "buoys": ["1", "2", "6", "7", "8", "reference"],
        "points": [(215.21, 362.85), (616.18, 442.27), (610.94, 212.53), (445.87, 309.67), (215.75, 306.95)],
    },
    "pr3": {
        "title": "PR3 II - circa 1.700 m",
        "detail": "Percorso indicativo - sviluppo KML circa 1.647 m",
        "color": "#26c6da",
        "file": "campo-gara-pr3-ii-1700m.pdf",
        "buoys": ["1", "2B", "7", "8", "reference"],
        "points": [(218.68, 354.83), (456.62, 399.67), (451.30, 298.17), (215.44, 295.23)],
    },
    "senior": {
        "title": "U19/U23/Senior 6 km",
        "detail": "Percorso indicativo - circa 5.951 m",
        "color": "#ffee58",
        "file": "campo-gara-u19-u23-senior-6km.pdf",
        "buoys": ["1", "2", "3", "4", "5", "6", "7", "8", "reference"],
        "points": [(221.49, 374.14), (615.48, 453.08), (815.10, 358.44), (1089.47, 475.70), (1088.67, 206.16), (863.74, 207.84), (600.62, 211.27), (443.78, 304.50), (211.77, 301.27)],
    },
    "complete": {
        "title": "Campo gara completo",
        "detail": "Nessun percorso evidenziato - coordinate di tutte le boe",
        "color": "#0b6b88",
        "file": "campo-gara-completo.pdf",
        "buoys": ["1", "2", "3", "4", "5", "6", "7", "8", "2B", "reference"],
        "points": [],
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


def draw_coordinates_page(pdf, route, page_w, page_h):
    navy = HexColor("#00192e")
    teal = HexColor("#0b6b88")
    pale = HexColor("#edf5f7")
    text_color = HexColor("#123b52")

    pdf.setFillColor(white)
    pdf.rect(0, 0, page_w, page_h, stroke=0, fill=1)
    pdf.setFillColor(navy)
    pdf.rect(0, page_h - 78, page_w, 78, stroke=0, fill=1)
    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(32, page_h - 34, "Coordinate boe - WGS84")
    pdf.setFont("Helvetica", 9.5)
    pdf.setFillColor(HexColor("#c6dce5"))
    pdf.drawString(32, page_h - 52, route["title"])

    left = 32
    table_top = page_h - 108
    row_h = 34
    col_name = left + 14
    col_lat = 440
    col_lng = 620

    pdf.setFillColor(teal)
    pdf.roundRect(left, table_top, page_w - 64, 30, 8, stroke=0, fill=1)
    pdf.setFillColor(white)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(col_name, table_top + 10, "Boa")
    pdf.drawString(col_lat, table_top + 10, "Latitudine")
    pdf.drawString(col_lng, table_top + 10, "Longitudine")

    y = table_top - row_h
    for index, buoy_id in enumerate(route["buoys"]):
        label, lat, lng = BUOYS[buoy_id]
        if index % 2 == 0:
            pdf.setFillColor(pale)
            pdf.roundRect(left, y, page_w - 64, row_h - 2, 5, stroke=0, fill=1)
        pdf.setFillColor(text_color)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(col_name, y + 11, label)
        pdf.setFont("Courier", 10)
        pdf.drawString(col_lat, y + 11, f"{lat:.6f}")
        pdf.drawString(col_lng, y + 11, f"{lng:.6f}")
        y -= row_h

    pdf.setFillColor(HexColor("#51636c"))
    pdf.setFont("Helvetica", 8.5)
    pdf.drawString(32, 42, "Il riferimento partenza/arrivo definisce la partenza con Boa 1 e l'arrivo con Boa 8.")
    pdf.drawRightString(page_w - 32, 25, "Pagina 2 di 2")


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

    if route["points"]:
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
    pdf.drawString(28, 34, "Schema indicativo. Le coordinate delle boe sono riportate nella pagina seguente.")
    pdf.drawRightString(page_w - 28, 34, "Pagina 1 di 2")

    pdf.showPage()
    draw_coordinates_page(pdf, route, page_w, page_h)
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
