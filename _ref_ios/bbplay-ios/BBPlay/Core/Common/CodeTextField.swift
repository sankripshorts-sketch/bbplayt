import Foundation
import SnapKit

final class CodeTextField: UITextField {
    
    private(set) weak var _delegate: MainTextFieldDelegate?
    
    override var canBecomeFirstResponder: Bool {
        return true
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        delegate = self
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
}

// MARK: - Private extension -
private extension CodeTextField {
    func setupUI() {
        font = Font.dinRoundProBold(size: 32.scale())
        textAlignment = .left
        tintColor = .clear
        borderStyle = .none
        keyboardType = .numberPad
    }
}

// MARK: - Override -
extension CodeTextField {
    override func textRect(forBounds bounds: CGRect) -> CGRect {
        var rect = super.textRect(forBounds: bounds)
        let spacing = bounds.width / 15
        rect.origin.x += spacing
        rect.size.width -= (spacing * 2)
        return rect
    }
    
    override func editingRect(forBounds bounds: CGRect) -> CGRect {
        return textRect(forBounds: bounds)
    }
}

// MARK: - Delegate -
extension CodeTextField: UITextFieldDelegate {
    func textFieldDidBeginEditing(_ textField: UITextField) {
        becomeFirstResponder()
    }
    
    func textField(_ textField: UITextField,
                            shouldChangeCharactersIn range: NSRange,
                            replacementString string: String) -> Bool {
        defer {
            _delegate?.actionTextInput()
        }
        
        guard let text = textField.text else { return false }

        let replacingString = (text as NSString).replacingCharacters(in: range, with: string)

        let codeString = replacingString.formatVerificationCode()

        let characterSpacing: CGFloat = bounds.width / 5.2
        let finalString = NSMutableAttributedString(string: codeString)
        
        if (finalString.length - 1) >= 0 {
            finalString.addAttribute(
                .kern,
                value: characterSpacing,
                range: NSRange(
                    location: 0,
                    length: finalString.length - 1
                )
            )
        }
        
        textField.attributedText = finalString
        return false
    }
    
    func textFieldShouldClear(_ textField: UITextField) -> Bool {
        _delegate?.actionTextInput()
        return true
    }
}

// MARK: - Delegate -
extension CodeTextField {
    func setDelegate(_ delegate: MainTextFieldDelegate) {
        _delegate = delegate
    }
}
