import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from 'pdf-lib';

const LOGO_JPEG_BASE64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAsICAoIBwsKCQoNDAsNERwSEQ8PESIZGhQcKSQrKigkJyctMkA3LTA9MCcnOEw5PUNFSElIKzZPVU5GVEBHSEX/2wBDAQwNDREPESESEiFFLicuRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUVFRUX/wAARCAA8AV4DASIAAhEBAxEB/8QAHAAAAgMBAQEBAAAAAAAAAAAABQYCAwQBAAcI/8QASRAAAgEDAgIFBggKCQUBAAAAAQIDAAQRBRIhMQYTQVFhFCIycZGxNUJTdIGhwdEHFRYjNFJVcnOSMzZDVIKU4fDxJGJjk7Ki/8QAGgEAAwEBAQEAAAAAAAAAAAAAAQIDBAAFBv/EACwRAAICAQMDAwMEAwEAAAAAAAECAAMREiExBBNBIlGBFGHwMnGR0TOhweH/2gAMAwEAAhEDEQA/AEPWOh2o6PYxXjFJ7d0DO8JyIye/w8Rwo9Y6Lpz2ETyacjMbZHDbXJdio7j4mlS06RarYWptra9lSA/2eQV9WD2eFfSujbltf0nkoYRHaowozGOQ5Cs1b2VsBaA3PuPaQ6twqro2yQIIk0HTVjLJp0TsGwBtflw8fX7KWoOjF1rHSC9tdPiEdvDOytI2dkYB4DxPhzr6V+EdiuqWAUlfzJ5HHxq+b6v0j1W31LUbS3vHhtzPIvVxAKPSPcM5PaeZo22OzaKgAfn7Tf8ASdipLXctq8e2IH1TT5NK1KeyldHeFtpZDkGpad6F783b3rWInJya26d/R3nzdvetW3078yHmYautbWS8nWKEZY+wDvqmj/RkLuuD8bC+zjV6UFjhTI3WGussJ4dH4Ews14BIeQAA95oXqFibC46oyK/DPDmPWOyqrppHuZTLkybjuzXoY3urhIwSXkYDJpnZG9Krgxa1dfU7ZEJWWiG7sevMhVmzsXHPuoUqZkCHhk4PhTexlt7i1ggiY26rtdgOA7BQLVbbybVgQMJKwce3j9dWuoVVBXxsZCi9nYhjzuJHVNJbT9jK5kjbhuxjBqnTdPbUJygO1FGWbGcU0XfUzt5HN/aqSv0fb21VYwxaesdoDulcF2Pfjtqp6Ve5kfp/NpEdW3awf1f894Eh0lZdUmszKQsYzuxz5ffWj8Q27u0cV8plHNcD760Wn9Zbv90/ZXRBYWuovdPeL1gZiUyOBNBakxkjyfPiM11mcAngHjO8G2ekNNfTW07mNoxnKjOeNZ4rCS4vXt4eO1iCx5AA8zRrTLpbzWrmVAQhjAXPcCK7o4HW6gV9PrT9tKtKNpA9z/qM19i6ifAH8mUfk/brhHvMSnswPdmhmoabLp8gDkMjei47azSM7Ss0hJcniTzzTBqJL9HYmn/pMIePPP8AxU8V2K2lcYlM2VMupsg7TBfaO1rapcRuZFIBfhjbmo6fpa3tpLM0pQxkjAGc8M0fluo7aG2WcDq5gEJPIcO3wqNvZCxt7pEOY2yy+A28q0fTJryOMb/xM/1T6MHnOx+YpRo0siogyzEACiepaN5DbrKkhkG7DZGMV3o/a9beGZh5sQyPWeVGFWW9hvILiJkVmIjLDs7PrH11GmgNWSeTxLXdQUsAB2HPzBFlo8F1axyvdBHf4nDv9daG6O26EB7wrnvAH20Ht0KX8SsMMJQCPpop0m/SIP3D765O32yxXcQv3O6FD7HPgSmDSUmt7qXrj+YZgMAedgZoTTBo/wAC3n+L/wCaX6jaqhVIHMrS7FnBPEJW2mLPpkt2ZSDHnzccDitNrosFxbxObva7qDtGMg93OrdP/q5df4/cKFaX8J2374qulF0ZXORJanbXhsYMKt0ft0OHvNp7iAPtobpunm/uGj3lUUZLAZrR0h+Eh/DX7a36ZBJa6NJLEhaeYZUAce4ffTaEa3SF2HMXuOtIYtktjH2gXUbI2F0Yt25cAq2MZFXxaYsmkvedaQy58zHDgaI61A1xp0NyyFZIwN6nmAef11G1/qvN/i94oGlRYwxtjIhF7GtTnfIBi9RPUdLWytYpVlLmQ4wRjHDNDKYtf+Dbb1j/AOajWoKOT4lrXZbEA8wXpennUJ2QsURVyWAz6qhqFkbG6aLO5cZVscxRrT4JbTRXkiRmnmG5QBx7h99R1yBp7CG6KFZEADqeYB/1qxoApzjfmRHUE3Yz6ePmYLfR2udN8picmTJ/N454qnTbEX1y0TOUwpbIGaM6XP5NoPXFdwQkkfTWi3tIje+XW5HVzRnIHfkcaovTo2gj5k26l11g/fBgW10lLjUbi1MpURfG28+OKHTx9VPJGDkIxXPqNMOnfD999PvFAbz9Nn/iN76z2oqoCPczRVYzWEH2Eor1er1Zpqmux8hUu991zhcbIosDefFj6I+g19L6I3a3VzpuovD5LFC4Rwc7QoBAZSeJGMA+NfK43MciuvNTkUauelF7KFW3CWwU5BT0vb9wpDWrNqOZK1C4A+Z9Q6bPDqV9a3Nu5nt4ICX6oZZjuztA7z9VfKdTurPUHmuTFLa3zOWeIedG5J4nJ4qfDj9FSg6TalHKHluDcAcNs3nf61j1K/bUbrrmQJ5oAUHgK41rr1jOZpbqLXRa3xheJjrdp3oXvzdvetYa3ad6F783b3rTGIOZhrTY3sljcCWPj2Mp5EVmqSIznCqWPcBmmUkHIisARg8Q+2qaXcMJZ7U9Z4oD/wA1RHqln+MzdNAyBVwu0AknvP0UK8nm+Sf+U1BkZDhlKnxGK0G9+SB/Ezjp6xkAn+YTm167aZzFJtjJ80bRwFWX+p297BASriaMgk44eNBgCTgDJPZVvk83yT/yml71hBBOcxuxWCCBjEI6rqiXU8MttvRo88TwINVWGpdVf+UXbPJ5hXPM1j8nm+Sf+U1WQVOCMEdlA2vq1mEVJo0DiF4NUgj1ie7YP1cgwABx7PuoddyrNdSypna7lhmqkjeRtqKzHuAzVklrPEMyQyKO9lIoM7uuPHMKoiNkc4xNej30VhcO8wYhlx5o8ajb6k9pfyTxDKSMcqe0ZrBXqAtYAAeJxqUkk+YwnU9KkbrpLU9bz4oDx9tD9T1R9QZVC7Il9Fc8z3msJhkVdxRgvftOKhTve7DSYqUIp1DeFtT1GG8tIIog4aPnuHhirbLXFjsmguQ7MFKow48MdtBVUu2FBJPYBVnk83yT/wAprhdZq1CcaK9OgwnZ6pFY6Y0UIbyluO4gYz/xXLXXrhbhTcvvi+MFUZoU8bp6asvrGKjXd+wYAOMTuxWckjOZvurqCTVBcwhghZWYEcc9tWazfxX8sTQhwFUg7h40Mo1adHnniWSWdUDDICjcaKdyzKqOYH7dWlmPGwlWn6jDa6dcQSBy8mcEDhxGKFUel6NMFzDcBj3MuKDXFtLaymOZCrDv7a61LFADjYTqXqYkodzCFpqMMGkTWrB+sfdggcOIrFZTLb3kMr52owJxWepxxPM+yJGdj2KMmpmwnGfEoKlGceZt1O7hvr5ZV3iPaFORx8a2XmvHESWGY1UYO5R9FBpYpIX2SoyN3MMGpRW004JhhkkA57FJxR77DJB5g+nU4UjOIXt9cV7eWLUNz7+AKqORFcsNUtLfT/JrhHcEnIA4EH6aCEEHBq42s6xda0Mgj/XKHHtph1DggkxT0yEEAfeEbu60uS1dbe2ZJT6LY5cfXXdQ1K2vLe3iAkARgWyByxjhQerZbeWDb10Tx7uI3KRmgb23G28IoUYO+0L3uvMerWxzGijB3KPor0GtrJayw3+5y/AFVHKgdeo/UWZzn+ov01eMY/uFotRhTRXsyH6xs4OOHPNR0nVvIS0coZoW44HNTQuvUBc4II8RjQhBU+d4YtNUgg1S5uXD9XLnbgcedDLhxLcSuucMxIz66qr1K1jMMGMtaqdQnq9Xq9U5SX2lpNf3UdtbIZJpDtVR219O0T8GdmGijvy9zcscMA2yNSBkgdpIFY/wN6bFda7dXUqhjbxgLnsJP+lfSOlAt7N9LeVza2sEkjl422YPVthQRyyT9nbQjcRXvfwTWc56uC38nzymimJA4dqtXy3pF0dvOjWpNaXq+KSAcHHfX37o90ptdWAiWdi6p5wmAV1wBzxwI8aXvwv6fBc9F0vvNMkEq7WHaDwxXZHIjMpB0sMGfC63ad6F783b3rWGt2nehe/N2961xiDmYaL9HPhB/wCGfeKEUX6OfCDfwz7xWjp/8qzP1P8Ahb9oV1HWDYXCxdVvyu7O7FWYg1nTwzJ6WcZ5q1Rv7Czup1e5lKOFwBvA4VCe/s9MtOqt2VmAwiKc8e8mvSJYM3cI0zy1ClV7QOqLtkCuowA8xKvvpr1C/FhCsjKzhm24BxSpYnOoW5Pyi++my+e1SIG8CmPdw3LnjWfpMitsHE0dYAbUyMwd+U0X93k/nFALmUTXMsoBAdi2D2Zpi8o0T9WD/wBZ+6lluZxyzUeoZyAGYH9pfplQElVI/eN9lElhpYkSPc2ze23mxxmssHSKCQMJ4mjGOGDuB8Ko0zXEihSC6BGwYVwM8PGiElnYanGXUI2fjx8CP9+Na1Yuo7JG3iYmQIx7ynfzFa5lWad5EjEaschF5CrNPtvK72OLsJy3q7aheWzWd1JCxyVPA94o30ctdsclyw4t5i+rtrDVWXt0n5no3WiurUPiGZY1nheFvRZduO6kiWJoZXjf0kJBpjtbmZtbm3RSCFxtUlTjhy+321h6Q2vV3azqPNlHH1itXUgWJrHg4mTpM1P228jMy6J8LQes+40wanqh07qvzfWdZn42MYpf0X4Wg9Z9xpmubW2unjS4QOwBKgkjh2/ZR6UMaTpODn+oOr0i9S4yMf3K7aeHWLNusi83O1lbjg+BpSni6meSPOdjFfZTTeXkGkQCOKHBIJRQOGfE0qO7SOzscsxyTUurI2U7sOZXo1PqYDCniEtO00SBZ7jhAGwePEHsJ8KZYAsYMaAKqnAAGMVi65be1glK7oWiXdsTPHHM+GKmkixqpUlrc+i/6vhntHj2dtaaVWrYTNczW7n8/wDZuyDyrJqdkt7aMuPziDch8e76anbONzqGJAPDPM/TWn11pIFi4Myb1OCPEQaL6Bc6hFdvDpiqZZ12liudg789mKFykGVyvLJxWzTdXutKMhtSgMmA25QeVfOWqSpAGf3n09LBXBJx+0MdL7hWa0t2frrmBCJZQuATw4fb9NbWurnTND0YaauBMQZCq53E9h9fH2Uu6jrd5qsaR3TIVQ7htQDjU9P6RX+mwGCCRTHnIV13bfVWT6du0q4Bx48TZ9QndZskZ8+Zr6Wolvr5aEAMyK7DHDd/sCjkV/ero9zd6wVEc8eyG2VOfDnjxpLlvJp7s3Ur75i24s3aaLHphqrAgvFx/wDEK6yhyiLscfm0FfUIHdySM+P7nOi+nxXd9JPccYrVesK4zuPZWnpTCt3Db6vFPI8U/mBJBgpz5eHA0FsNRudMuOutX2tjBBGQw7iKs1LWLvVSnlTjanooq4AqhqsNwfO0QW1ig1kb/n5iQtLW0mjLXGoJbMDgI0Ttkd+QKv8Axfpv7Zi/y8n3ULr1acfeZM/aFPxfpv7Zi/y8n3V78X6b+2Yv8vJ91C69XYPvOz9oU/F+m/tmL/LyfdTNonQbT9StFuhqj3EbHH5mPbg9xzx+qkWrEmkjyI3dc/qsRSsrEbGMrAHcRq6YdGbHQ7W2ls5JNzuVdJHBPLIIGB40o1JmZzliST2njUaKggYJzAxBOQI7/gu1+LROkvVXDBYbxerLHsbsr7JrkcV/f6RaEqyyytIcgMGRVyfadv11+ZQccqfuh/TfWEmis5pY7mKI5jM6bmQ8uB9RNNCo1bT6jP0T0SzvLrUbt5269i7xvMdpJ44wOJ8BSH+EvVLKz0qPSLBHhe4cSzQNIWEQHLhnhnhXOlPSu+0eFVsI7eFm+PsLMvDHAknHKvmNzcS3Vw81xI0krnLOxySaELZHJlVbtO9C9+bt71rDW7TvQvfm7e9a4xBzMNF+jnwg/wDDPvFCKkrFTlSQfA1Wt9DhvaSsTWhX3hbpJ+np/DHvNB6kzFjliSfE1GusfW5b3nVJoQL7TRYfp9v/ABF99Nt/YrfwrG7MoVt2VFJYJByDg1PrZPlG9pqtN4RSrDOZG6hrGDKcERh/JqD5eX2CgVzAkF7JCWOxH27sccVX1snyje01Akk5JyaWx62HpXEequxSdbZjR+KLC8tY/J2wFHCROJPrq+x0+LS0kcyk7ubPwAxSkkjxnKOyn/tOK68skv8ASOzfvEmrDqEHqCbyDdNY3pL7TVqEwvtSdogSGIVPHsFMcjppGmL5u7qwFA5bif8AZpPBIOQcGpF2bgzMR4mp13lCzY3MrZ04cKudhDn5TH+7f/v/AErfqMS6hpJeMZO0SJSjUxI4GA7AdwNMvVMQQ+4MQ9IgIavYibNF+FoPWfcaKa/M9tNZyxnDqWI+ql1WKnIJB8K6zs3pMT6zSLdpqKCUejVaLCeI24h1rTu4n2o1KtxbyWszRSjDqeNRV2X0WI9RrhYscsST4mutuFoBI3nU0mokA7Rj0K/WWAWkpG9fRz8Yd1E3iYJ/05VCOSlfNPh4UkKSpyDgjkaK2mt3isI2ZZB3uOPtrT0/UggI0y9R0pB7iH4hgK6hJI4nXPE4GQvgw7fWOVUX+sRpZMsTgzvlcAEbPbWK81y7HmJsTPaq8froRJI0jl3Ysx4kk5Jrrr9HpSGnp+5hnkKM6FaxzxXsnkwu7iJAYoDnDZPE4HE47qDVNHaNtyMVYciDg15jqWXAM9StgrZIh6zsll1O86/TlSeOHfFZcQGbh45PDjiuX2lie702KO2Frc3Q/OwLnCcfSweXDJxQLrH6zfubfnO7PH213rpOs6zrG3/rbjn21LttnIMr3U04K/n8Q9rmmW8V3aTWUINtM3VlImDZYHGMg8yMGpa/bQ2EtpcRWUKQksBFIjKxx2MCePrHOl7e2zZuO3OcZ4Z767JK8pBkdnIGMsc1y1MNOW4zC1ynVhcZx8Q9qtnHPq1rp9paxQmRY23IDnzlBOcnkK5r2m20Fzaz2aILaRurIRtw3A947xg0C66TeH6x94GA245xXOscIFDHbnOM8M99cKmGPVxONqkN6ef9Qlr2nvY6ncYtnhtjIRESpCkeFFejmn2d1ppkuII5HM5TzgSzDZnauCPO7qWpJ5ZQBJI7gctzE1xZZFACuygHcACRg99c1bNWFzv7wLai2FtOR7Q3pdojWV1PDYC9uUmCCB8nYnHiQOfdVx06zPSKXT1RVE8O1QTnqZSucA+B4UvrLIrl1dg55sGIJqIdlYOGIYccg8c1xqYknVCLlAA08Rk1uy0+0057i1jUmZlhj5+YUzvP04HtqEFhanXNNheAGKW1V5E4+cdhJNLxdmABYkA5AJ76l1sgIYO25RgHccgUBUwXTq94TcpbVp9obv8ATbGGPShFIDBcyNun7SmVxnxGSKK3GhW8sTh4LaxWOUqjuHBZeOPOzhs8+FJpdiiqWJUZwM8BXXlkdVV3ZlXkCcgUDS+2GhF6DOU5n//Z';
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

const COLORS = {
  ink: rgb(0.11, 0.25, 0.29),
  muted: rgb(0.37, 0.46, 0.49),
  line: rgb(0.79, 0.85, 0.86),
  blue: rgb(0.02, 0.39, 0.49),
  blueSoft: rgb(0.92, 0.97, 0.98),
  yellowSoft: rgb(1.0, 0.97, 0.84),
  yellowLine: rgb(0.91, 0.76, 0.28),
  noteSoft: rgb(0.96, 0.98, 0.98),
  white: rgb(1, 1, 1)
};

function safeText(value) {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/•/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapText(font, text, size, maxWidth) {
  const words = safeText(text).split(' ').filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatRaceDay(value) {
  const text = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text || 'Giorno da definire';
  try {
    const formatted = new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Rome'
    }).format(new Date(text + 'T12:00:00Z'));
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return text;
  }
}

function formatRaceTime(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  return match ? match[1].padStart(2, '0') + ':' + match[2] : 'orario da definire';
}

function timeMinutes(value) {
  const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
  if (!match) return 9999;
  return (Number(match[1]) * 60) + Number(match[2]);
}

function daySortKey(label, assignments, races) {
  const assignment = assignments.find((row) => row.day === label && row.startsAt);
  if (assignment) {
    const stamp = Date.parse(assignment.startsAt);
    if (Number.isFinite(stamp)) return stamp;
  }
  const race = races.find((row) => formatRaceDay(row.raceDate) === label);
  if (race?.raceDate) {
    const stamp = Date.parse(race.raceDate + 'T00:00:00Z');
    if (Number.isFinite(stamp)) return stamp;
  }
  return Number.MAX_SAFE_INTEGER;
}

function addLink(page, doc, x, y, width, height, url) {
  if (!url || !width || !height) return;
  try {
    const annotation = doc.context.register(doc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      A: {
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of(String(url))
      }
    }));
    page.node.addAnnot(annotation);
  } catch {}
}

export async function buildVolunteerProgramPdf({
  personState,
  programUrl = '',
  ficUrl = 'https://www.canottaggio.org/'
}) {
  const doc = await PDFDocument.create();
  doc.setTitle('Il programma delle tue attività');
  doc.setSubject('Campionati Italiani Coastal Rowing 2026 - programma volontario');
  doc.setCreator('Società Canottieri Pesaro ASD');

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo = null;
  try {
    logo = await doc.embedJpg(Buffer.from(LOGO_JPEG_BASE64, 'base64'));
  } catch {}

  const personName = safeText(personState?.person?.display_name || 'Volontario');
  const assignments = [...(Array.isArray(personState?.assignments) ? personState.assignments : [])]
    .sort((a, b) => Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999)
      || safeText(a.activity).localeCompare(safeText(b.activity), 'it'));
  const races = [...(Array.isArray(personState?.races) ? personState.races : [])]
    .sort((a, b) => String(a.raceDate || '').localeCompare(String(b.raceDate || ''))
      || String(a.raceTime || '').localeCompare(String(b.raceTime || ''))
      || String(a.crewLabel || '').localeCompare(String(b.crewLabel || ''), 'it'));
  const handoverByAssignment = new Map(
    (Array.isArray(personState?.handovers) ? personState.handovers : [])
      .map((row) => [row.assignmentId, row])
  );

  const dayLabels = [...new Set([
    ...assignments.map((row) => safeText(row.day)).filter(Boolean),
    ...races.map((row) => formatRaceDay(row.raceDate)).filter(Boolean)
  ])].sort((a, b) => daySortKey(a, assignments, races) - daySortKey(b, assignments, races));

  let page;
  let y;

  function addPage(first = false) {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;

    if (first) {
      if (logo) {
        const natural = logo.scale(1);
        const width = 238;
        const height = natural.height * (width / natural.width);
        page.drawImage(logo, {
          x: (PAGE_WIDTH - width) / 2,
          y: y - height,
          width,
          height
        });
        y -= height + 18;
      }

      page.drawText(personName, {
        x: MARGIN,
        y: y - 25,
        size: 25,
        font: bold,
        color: COLORS.ink
      });
      y -= 34;
      page.drawText('Il programma delle tue attività', {
        x: MARGIN,
        y: y - 13,
        size: 12,
        font: regular,
        color: COLORS.muted
      });
      y -= 28;

      const introLines = [
        'Qui per ogni giorno trovi:',
        '- le attività di supporto dove nel riquadro "Chi viene dopo di me" trovi le persone che ti daranno il cambio;',
        '- le gare a cui parteciperai con il tuo equipaggio.'
      ];
      const wrapped = introLines.flatMap((line) => wrapText(regular, line, 9.3, CONTENT_WIDTH - 24));
      const introHeight = 18 + (wrapped.length * 13) + 12;
      page.drawRectangle({
        x: MARGIN,
        y: y - introHeight,
        width: CONTENT_WIDTH,
        height: introHeight,
        color: COLORS.noteSoft,
        borderColor: COLORS.line,
        borderWidth: 0.8
      });
      let iy = y - 17;
      for (let i = 0; i < wrapped.length; i += 1) {
        page.drawText(wrapped[i], {
          x: MARGIN + 12,
          y: iy,
          size: 9.3,
          font: i === 0 ? bold : regular,
          color: COLORS.ink
        });
        iy -= 13;
      }
      y -= introHeight + 20;
    } else {
      page.drawText(personName + ' - Il programma delle tue attività', {
        x: MARGIN,
        y: y - 12,
        size: 10,
        font: bold,
        color: COLORS.muted
      });
      y -= 28;
    }
  }

  function ensureSpace(height) {
    if (y - height < 68) addPage(false);
  }

  function drawDayTitle(label) {
    ensureSpace(40);
    page.drawRectangle({
      x: MARGIN,
      y: y - 29,
      width: CONTENT_WIDTH,
      height: 29,
      color: COLORS.blue
    });
    page.drawText(safeText(label), {
      x: MARGIN + 12,
      y: y - 19,
      size: 12,
      font: bold,
      color: COLORS.white
    });
    y -= 39;
  }

  function drawAssignment(row) {
    const activity = safeText(row.activity || 'Attività di supporto');
    const activityLines = wrapText(bold, activity, 10.6, CONTENT_WIDTH - 28);
    const handover = handoverByAssignment.get(row.id) || null;
    const successorText = handover?.successors?.length
      ? handover.successors.join(', ')
      : '';
    const successorLines = successorText
      ? wrapText(regular, successorText, 8.8, CONTENT_WIDTH - 46)
      : [];
    const handoverHeight = successorLines.length ? 34 + (successorLines.length * 11) : 0;
    const height = 48 + (activityLines.length * 13) + handoverHeight + 10;

    ensureSpace(height + 8);
    page.drawRectangle({
      x: MARGIN,
      y: y - height,
      width: CONTENT_WIDTH,
      height,
      color: COLORS.blueSoft,
      borderColor: COLORS.line,
      borderWidth: 0.8
    });

    page.drawText('ATTIVITÀ DI SUPPORTO', {
      x: MARGIN + 12,
      y: y - 15,
      size: 7.3,
      font: bold,
      color: COLORS.blue
    });
    page.drawText(safeText(row.shift || ''), {
      x: MARGIN + 12,
      y: y - 31,
      size: 10.5,
      font: bold,
      color: COLORS.ink
    });

    let ay = y - 47;
    for (const line of activityLines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: ay,
        size: 10.6,
        font: bold,
        color: COLORS.ink
      });
      ay -= 13;
    }

    if (successorLines.length) {
      const boxTop = ay - 2;
      const boxHeight = 25 + (successorLines.length * 11);
      page.drawRectangle({
        x: MARGIN + 12,
        y: boxTop - boxHeight,
        width: CONTENT_WIDTH - 24,
        height: boxHeight,
        color: COLORS.white,
        borderColor: COLORS.blue,
        borderWidth: 0.8
      });
      page.drawText('CHI VIENE DOPO DI ME - ' + safeText(handover.toShift || ''), {
        x: MARGIN + 22,
        y: boxTop - 14,
        size: 7.8,
        font: bold,
        color: COLORS.blue
      });
      let sy = boxTop - 27;
      for (const line of successorLines) {
        page.drawText(line, {
          x: MARGIN + 22,
          y: sy,
          size: 8.8,
          font: regular,
          color: COLORS.ink
        });
        sy -= 11;
      }
    }

    y -= height + 8;
  }

  function drawRace(row) {
    const title = safeText(row.crewLabel || 'Gara');
    const titleLines = wrapText(bold, title, 10.6, CONTENT_WIDTH - 28);
    const crewText = Array.isArray(row.crewMembers) && row.crewMembers.length
      ? 'Equipaggio: ' + row.crewMembers.join(', ')
      : '';
    const crewLines = crewText ? wrapText(regular, crewText, 8.8, CONTENT_WIDTH - 28) : [];
    const height = 45 + (titleLines.length * 13) + (crewLines.length * 11) + 8;

    ensureSpace(height + 8);
    page.drawRectangle({
      x: MARGIN,
      y: y - height,
      width: CONTENT_WIDTH,
      height,
      color: COLORS.yellowSoft,
      borderColor: COLORS.yellowLine,
      borderWidth: 0.8
    });
    page.drawText('GARA', {
      x: MARGIN + 12,
      y: y - 15,
      size: 7.3,
      font: bold,
      color: rgb(0.55, 0.38, 0.02)
    });
    page.drawText(formatRaceTime(row.raceTime), {
      x: MARGIN + 12,
      y: y - 31,
      size: 10.5,
      font: bold,
      color: COLORS.ink
    });
    let ry = y - 47;
    for (const line of titleLines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: ry,
        size: 10.6,
        font: bold,
        color: COLORS.ink
      });
      ry -= 13;
    }
    for (const line of crewLines) {
      page.drawText(line, {
        x: MARGIN + 12,
        y: ry - 1,
        size: 8.8,
        font: regular,
        color: COLORS.muted
      });
      ry -= 11;
    }
    y -= height + 8;
  }

  function drawRememberBox() {
    const line1a = 'Questa è una stampa. La situazione aggiornata la trovi sempre qui: ';
    const link1 = 'Le mie attività';
    const line2a = 'Verifica sempre gli orari delle gare nel ';
    const link2 = 'sito ufficiale della FIC';
    const rememberHeight = 82;
    ensureSpace(rememberHeight + 10);

    page.drawRectangle({
      x: MARGIN,
      y: y - rememberHeight,
      width: CONTENT_WIDTH,
      height: rememberHeight,
      color: COLORS.noteSoft,
      borderColor: COLORS.line,
      borderWidth: 0.8
    });
    page.drawText('RICORDA', {
      x: MARGIN + 12,
      y: y - 17,
      size: 8,
      font: bold,
      color: COLORS.blue
    });

    const x = MARGIN + 12;
    const y1 = y - 36;
    page.drawText(line1a, { x, y: y1, size: 8.8, font: regular, color: COLORS.ink });
    const xLink1 = x + regular.widthOfTextAtSize(line1a, 8.8);
    page.drawText(link1, { x: xLink1, y: y1, size: 8.8, font: bold, color: COLORS.blue });
    const w1 = bold.widthOfTextAtSize(link1, 8.8);
    page.drawLine({ start: { x: xLink1, y: y1 - 1 }, end: { x: xLink1 + w1, y: y1 - 1 }, thickness: 0.5, color: COLORS.blue });
    addLink(page, doc, xLink1, y1 - 2, w1, 12, programUrl);

    const y2 = y - 55;
    page.drawText(line2a, { x, y: y2, size: 8.8, font: regular, color: COLORS.ink });
    const xLink2 = x + regular.widthOfTextAtSize(line2a, 8.8);
    page.drawText(link2, { x: xLink2, y: y2, size: 8.8, font: bold, color: COLORS.blue });
    const w2 = bold.widthOfTextAtSize(link2, 8.8);
    page.drawLine({ start: { x: xLink2, y: y2 - 1 }, end: { x: xLink2 + w2, y: y2 - 1 }, thickness: 0.5, color: COLORS.blue });
    addLink(page, doc, xLink2, y2 - 2, w2, 12, ficUrl);

    y -= rememberHeight + 8;
  }

  addPage(true);

  if (!dayLabels.length) {
    page.drawText('Non risultano attività o gare da mostrare.', {
      x: MARGIN,
      y: y - 12,
      size: 10,
      font: regular,
      color: COLORS.muted
    });
    y -= 30;
  } else {
    for (const day of dayLabels) {
      drawDayTitle(day);
      const dayItems = [
        ...assignments
          .filter((row) => safeText(row.day) === day)
          .map((row) => ({ kind: 'assignment', time: timeMinutes(row.shift), row })),
        ...races
          .filter((row) => formatRaceDay(row.raceDate) === day)
          .map((row) => ({ kind: 'race', time: timeMinutes(row.raceTime), row }))
      ].sort((a, b) => a.time - b.time || (a.kind === 'race' ? 1 : -1));

      for (const item of dayItems) {
        if (item.kind === 'assignment') drawAssignment(item.row);
        else drawRace(item.row);
      }
      y -= 5;
    }
  }

  drawRememberBox();

  const pages = doc.getPages();
  pages.forEach((item, index) => {
    item.drawText('Campionati Italiani Coastal Rowing 2026 - Pesaro', {
      x: MARGIN,
      y: 28,
      size: 7.2,
      font: regular,
      color: COLORS.muted
    });
    const pageLabel = `${index + 1}/${pages.length}`;
    item.drawText(pageLabel, {
      x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(pageLabel, 7.2),
      y: 28,
      size: 7.2,
      font: regular,
      color: COLORS.muted
    });
  });

  return doc.save();
}
