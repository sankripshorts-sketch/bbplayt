import Foundation
import UIKit

final class DateTextField: MainTextField {}

// MARK: - Delegate
extension DateTextField {
    
    override func textField(_ textField: UITextField,
                            shouldChangeCharactersIn range: NSRange,
                            replacementString string: String) -> Bool {
        defer {
            _delegate?.actionTextInput()
        }
        
        guard let text = textField.text else { return true }
        let newString = (text as NSString).replacingCharacters(in: range, with: string)
        textField.text = newString.formatBirthdayDate()
        changeState(with: .active)
        return false
    }
    
    override func textFieldDidEndEditing(_ textField: UITextField,
                                         reason: UITextField.DidEndEditingReason) {
        resignFirstResponder()
        
        guard let text = textField.text else { return }
        text.count == 10 ? changeState(with: .haveText) : changeState(with: .incorrect)
        guard text.checkDate() else {
            changeState(with: .incorrect)
            return
        }
    }
}
