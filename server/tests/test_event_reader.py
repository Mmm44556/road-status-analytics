import ssl
import unittest

from server.traffic.utils.eventReader import create_npa_ssl_context, parse_a3_csv


class EventReaderTests(unittest.TestCase):
    def test_npa_context_still_verifies_ca_and_hostname(self):
        context = create_npa_ssl_context()

        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(context.check_hostname)

    def test_parses_current_a3_csv_format(self):
        payload = "ACCYMD,PLACE,CARTYPE\n115年08月01日 10時00分00秒,臺中市西屯區,自用小客車\n"

        result = parse_a3_csv(payload)

        self.assertEqual(result["result"]["records"][0]["PLACE"], "臺中市西屯區")


if __name__ == "__main__":
    unittest.main()
