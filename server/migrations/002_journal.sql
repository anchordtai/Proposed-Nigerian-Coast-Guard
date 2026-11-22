ALTER TABLE content DROP CONSTRAINT content_kind_check;
ALTER TABLE content ADD CONSTRAINT content_kind_check CHECK (kind IN (
  'page','article','news','press','advisory','statement','document','faq','announcement',
  'milestone','gallery','video','consultation','job','menu','homepage','social','journal'
));

INSERT INTO content (kind, slug, title, subtitle, body, category, author, tags, seo_description, position, status, published_at)
VALUES (
  'journal',
  'how-to-follow-the-coast-guard-proposal',
  'How to follow the Coast Guard proposal',
  'A reader’s guide to parliamentary records, committee reports and the language used at each stage.',
  $journal$An announcement that a bill has reached a new stage can be difficult to interpret on its own. Start by recording the bill number, the chamber, the date and the action described. The same title may appear in several documents, so those details help you identify the correct record.

## Start with the source

Use the [National Assembly’s public records](https://nass.gov.ng/page/notices.html) to find bills and proceedings. When reading a committee report or a recap of proceedings, check what the document says was discussed, recommended or decided. Those are distinct actions. If a report refers to a vote or a subsequent decision, look for the record of that action.

## Keep an eye on the dates

Make a short timeline using the date of each parliamentary action. News coverage may have been published on a later date. The [legislative journey](/legislation) gives readers a starting point for checking the source documents and the stages recorded for the proposal.$journal$,
  'Legislation', 'Journal editorial desk', ARRAY['Legislative records','Public information'],
  'Learn how to use parliamentary records to follow the Proposed Nigerian Coast Guard and identify what each reported stage means.', -1, 'published', now()
), (
  'journal',
  'finding-reliable-maritime-information',
  'Finding reliable maritime information',
  'Where readers can start when looking for maritime safety guidance, port information and general public resources.',
  $journal$Maritime information is often shared as a screenshot, a forwarded message or a link. Before acting on it, confirm who issued it, when it was published and which waters or activities it covers.

## Find the right source for your question

For general information on maritime safety and emergency services, start with the [Nigerian Maritime Administration and Safety Agency](https://nimasa.gov.ng/what-we-do/maritime-safety-security/). For information about regulated port operations, consult the [Nigerian Ports Authority](https://nigerianports.gov.ng/faqs/) and the relevant port’s published instructions.

The [public document library](/documents) lists links to source material for further reading. Keep a bookmark to the issuing authority’s page so you can check for revisions before relying on old material.$journal$,
  'Maritime information', 'Journal editorial desk', ARRAY['Public information','Maritime resources'],
  'Find official starting points for maritime safety and port information, and learn how to check the source of public notices.', 0, 'published', now()
)
ON CONFLICT (kind, slug) DO NOTHING;
