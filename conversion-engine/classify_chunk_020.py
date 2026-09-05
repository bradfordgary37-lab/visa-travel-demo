import sys
sys.path.insert(0, ".")
from layer3_write import append_results


def L(lead_id, domain, business_name, primary, confidence, summary,
      conv, cart, eng, followup, ci, ev_conv, ev_cart, ev_eng, ev_followup,
      open_gap_count, secondary=None, disqualifier=None):
    return (lead_id, domain, business_name, primary, secondary, confidence, summary,
            conv, cart, eng, followup, ci, ev_conv, ev_cart, ev_eng, ev_followup,
            open_gap_count, disqualifier)


RESULTS = [
L(1698, "sonriart.mx", "Sonriart", primary="Follow-up Opportunity", confidence="low",
  summary="Mexican dental-clinic business (likely, based on branding) with WhatsApp chat and reviews already live, but page copy is mostly unrendered SVG-icon CSS, no ESP.",
  conv=35, cart=20, eng=35, followup=40, ci=25,
  ev_conv="has_cart=False — likely a clinical/appointment-based business", ev_cart="has_cart=False",
  ev_eng="WhatsApp chat and reviews already present despite thin readable content", ev_followup="no email capture form detected",
  open_gap_count=1),
L(1700, "www.aspen-elevated.com", "Aspen-Elevated", primary="Cart Recovery Opportunity", secondary="Follow-up Opportunity", confidence="low",
  summary="US business (cannabis/wellness dispensary likely) with booking and an active promo, but page copy is mostly unrendered PPC-page CSS, no ESP.",
  conv=35, cart=45, eng=30, followup=40, ci=25,
  ev_conv="has_cart=True, has_promo_bar=True, no ESP; page content largely unrendered PPC-page CSS", ev_cart="has_cart=True, has_esp_tag=none",
  ev_eng="booking already offered, cta_count_above_fold=2", ev_followup="has_email_form=True and has_contact_form=True but no ESP automation",
  open_gap_count=2),
L(1701, "gdoc.co.uk", "Hellier Health", primary="Follow-up Opportunity", secondary="Cart Recovery Opportunity", confidence="low",
  summary="UK healthcare clinic (recently rebranded to Hellier Health) with both email and contact forms and reviews already live, but no ESP.",
  conv=40, cart=30, eng=40, followup=50, ci=30,
  ev_conv="has_cart=True likely false-positive for an appointment-booking clinic", ev_cart="has_cart=True, has_esp_tag=none",
  ev_eng="reviews present", ev_followup="has_email_form=True and has_contact_form=True but no ESP automation for patient-booking leads",
  open_gap_count=2),
L(1702, "www.autopantti.fi", "Autopantti", primary="Follow-up Opportunity", confidence="low",
  summary="Finnish car-pawn/auto-finance business (likely, based on domain name) with an email form but no ESP; page copy is mostly unrendered Elementor CSS.",
  conv=30, cart=20, eng=20, followup=35, ci=20,
  ev_conv="has_cart=False; page content largely unrendered CSS boilerplate", ev_cart="has_cart=False",
  ev_eng="no chat/reviews/popup", ev_followup="has_email_form=True but no ESP automation; content quality uncertain",
  open_gap_count=1),
L(1703, "bahadirogullari.com", "Bahadirogullari", primary="Not a Good Fit", confidence="medium",
  summary="Turkish logistics/freight/storage B2B business already running Mailchimp ESP with both email and contact forms.",
  conv=25, cart=15, eng=25, followup=20, ci=30,
  ev_conv="has_cart=True likely false-positive for a B2B logistics business", ev_cart="has_esp_tag=mailchimp",
  ev_eng="no chat/reviews", ev_followup="email capture and ESP already wired together",
  open_gap_count=1, disqualifier="already has ESP in place"),
L(1704, "lyybnitsa.ee", "Lyybnitsa", primary="Follow-up Opportunity", confidence="low",
  summary="Estonian guesthouse (Lake Peipus, Setomaa) with an online booking widget already live but no email-capture form or ESP.",
  conv=40, cart=20, eng=35, followup=50, ci=30,
  ev_conv="has_cart=False — vacation-stay booking business", ev_cart="has_cart=False",
  ev_eng="booking widget already active", ev_followup="no email capture form detected for high-value stay bookings",
  open_gap_count=1),
]

n = append_results(RESULTS)
print(f"appended {n} rows (chunk_020 - FINAL CHUNK)")
