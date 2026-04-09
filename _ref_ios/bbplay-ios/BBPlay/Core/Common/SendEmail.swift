import Foundation
import MessageUI
import UIKit

class SendEmailViewController: UIViewController, MFMailComposeViewControllerDelegate {
    
    func sendEmail(message: String) {
        let recipientEmail = Localizable.mail()
        let subject = Localizable.feedbackTheme()
        openMailClient(to: recipientEmail, subject: subject, body: message)
    }
    
    private func openMailClient(to: String, subject: String, body: String)  {
        let subjectEncoded = subject.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
        let bodyEncoded = body.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
        
        let gmailUrl = URL(string: "googlegmail://co?to=\(to)&subject=\(subjectEncoded)&body=\(bodyEncoded)")
        
        if let gmailUrl = gmailUrl, UIApplication.shared.canOpenURL(gmailUrl) {
            UIApplication.shared.open(gmailUrl)
            self.dismiss(animated: true)
        } else {
            guard MFMailComposeViewController.canSendMail() else {
                logger.error("Mail services are not available")
                self.dismiss(animated: true)
                return
            }
            let mail = MFMailComposeViewController()
            mail.mailComposeDelegate = self
            mail.setToRecipients([to])
            mail.setSubject(subject)
            mail.setMessageBody(body, isHTML: false)
            self.present(mail, animated: true)
        }
    }
    
    func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
        controller.dismiss(animated: true)
        self.dismiss(animated: true)
    }
}
