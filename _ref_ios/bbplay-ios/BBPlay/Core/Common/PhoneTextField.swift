import Foundation
import UIKit

final class PhoneTextField: MainTextField {

    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if action == #selector(UIResponderStandardEditActions.paste(_:)) {
            guard var url = UIPasteboard.general.string else {
                return false
            }
            url = url.leaveOnlyNumbers()
            
            if url.count >= 11 && url.first == "8" {
                UIPasteboard.general.string = String(url.dropFirst())
                return true
            }
            else if url.count > 1 && url.first == "+" {
                UIPasteboard.general.string = String(url.dropFirst(2))
                return true
            } else {
                UIPasteboard.general.string = url
                return true
            }
        }
        return super.canPerformAction(action, withSender: sender)
    }
}

// MARK: - Delegate -
extension PhoneTextField {
    override func textFieldDidBeginEditing(_ textField: UITextField) {
        if textFieldType == .phoneNumber && textField.text == "" {
            textField.text = "7".formatPhoneNumber()
        }
        super.textFieldDidBeginEditing(textField)
    }
    
    override func textField(_ textField: UITextField,
                            shouldChangeCharactersIn range: NSRange,
                            replacementString string: String) -> Bool {
        defer {
            _delegate?.actionTextInput()
        }
        
        guard !(range.location <= 1) else { return false }
        
        guard let text = textField.text else { return true }
        if text.isEmpty {
            textField.text = "7".formatPhoneNumber() + " \(string)"
            changeState(with: .active)
            return false
        }
        
        let newString = (text as NSString).replacingCharacters(in: range, with: string)
        textField.text = newString.formatPhoneNumber()
        changeState(with: .active)
        return false
    }
    
    override func textFieldDidEndEditing(_ textField: UITextField,
                                         reason: UITextField.DidEndEditingReason) {
        resignFirstResponder()
        
        guard let text = textField.text else { return }
        ((text.contains("8") && text.count == 15) || (text.contains("+") && text.count == 16)) ? changeState(with: .haveText) : changeState(with: .incorrect)
    }
}
