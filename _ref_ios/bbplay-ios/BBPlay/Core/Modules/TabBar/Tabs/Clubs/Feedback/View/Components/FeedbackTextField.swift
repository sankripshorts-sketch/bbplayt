import Foundation
import UIKit

final class FeedbackTextField: GreenLineBottomTextField {
    
    private weak var _delegate: MainTextFieldDelegate?
    
    override func setupUI() {
        super.setupUI()
        delegate = self
        attributedPlaceholder = NSAttributedString(
            string: Localizable.enterFeedback(),
            attributes: [.font: Font.dinRoundProBold(size: 20.scale())!,
                         .foregroundColor: UIColor.white])
        font = Font.dinRoundProBold(size: 20.scale())
        
        addTarget(self, action: #selector(textChanged), for: .editingChanged)
    }
    
    @objc func textChanged() {
        _delegate?.actionTextInput()
    }
}

extension FeedbackTextField: UITextFieldDelegate {
    func textFieldDidEndEditing(_ textField: UITextField) {
        resignFirstResponder()
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        resignFirstResponder()
        return true
    }
}

extension FeedbackTextField {
    func setDelegate(_ delegate: MainTextFieldDelegate) {
        _delegate = delegate
    }
}
