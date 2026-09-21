import { ApiError, clean, formatApiError, verifyVolunteerSummaryPdfToken } from './_lib/volunteers-common.mjs';
import { createVolunteerSummaryPdf } from './_lib/volunteer-summary-pdf-lib.mjs';
import { loadVolunteerSubmissionSummary, sampleVolunteerSubmissionSummary } from './_lib/volunteer-summary.mjs';

export default async (request) => {
  try {
    if (request.method !== 'GET') throw new ApiError('Metodo non consentito.', 405, 'METHOD_NOT_ALLOWED');

    const url = new URL(request.url);
    const pathValue = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) || '');
    const isSample = pathValue.toLowerCase() === 'sample.pdf' || url.searchParams.get('sample') === '1';
    let summary;

    if (isSample) {
      summary = sampleVolunteerSubmissionSummary();
    } else {
      const token = clean(
        (pathValue && pathValue !== 'volunteer-summary-pdf' ? pathValue.replace(/\.pdf$/i, '') : '') || url.searchParams.get('token'),
        4000
      );
      const payload = verifyVolunteerSummaryPdfToken(token);
      summary = await loadVolunteerSubmissionSummary(payload.submissionId);
    }

    const bytes = await createVolunteerSummaryPdf(summary);
    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'inline; filename="riepilogo-disponibilita-volontario.pdf"',
        'cache-control': 'private, no-store, max-age=0',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': 'noindex, nofollow, noarchive'
      }
    });
  } catch (error) {
    return formatApiError(error);
  }
};

export const config = { path: ['/api/volunteer-summary-pdf', '/api/volunteer-summary-pdf/:token'] };
