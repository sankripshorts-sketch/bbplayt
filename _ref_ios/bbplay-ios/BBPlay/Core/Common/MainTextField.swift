import Foundation
import SnapKit

protocol MainTextFieldDelegate: AnyObject {
    func actionTextInput()
    func chagedState(
        _ type: MainTextField.TextFieldType,
        state: MainTextField.TextFieldState
    )
}

extension MainTextFieldDelegate {
    func chagedState(
        _ type: MainTextField.TextFieldType,
        state: MainTextField.TextFieldState
    ) {}
}

class MainTextField: UITextField {    
    enum TextFieldState {
        case active
        case inactive
        case haveText
        case incorrect
    }

    enum TextFieldType {
        case nickname
        case phoneNumber
        case mail
        case name
        case surname
        case dateOfBirth
        case password
    }

    override var canBecomeFirstResponder: Bool {
        return true
    }
    
    private(set) weak var _delegate: MainTextFieldDelegate?

    private(set) var textFieldType: TextFieldType = .nickname

    private var stateTextField: TextFieldState = .inactive {
        didSet {
            _delegate?.chagedState(textFieldType, state: stateTextField)
        }
    }
    
    private var limitedTextLength: Int {
        switch textFieldType {
            case .mail:
                return 49
            default:
                return 19
        }
    }

    private let viewingPassword = UIButton()

    private let profileView = UIImageView(image: Image.nickname()!.withTintColor(Color.inactiveIconTextField()!))
    private let phoneView = UIImageView(image: Image.phone()!.withTintColor(Color.inactiveIconTextField()!))
    private let mailView = UIImageView(image: Image.mail()!.withTintColor(Color.inactiveIconTextField()!))
    private let initials = UIImageView(image: Image.nameCard()?.withTintColor(Color.inactiveIconTextField()!))
    private let dateOfBirth = UIImageView(image: Image.calendar()?.withTintColor(Color.inactiveIconTextField()!))
    private let keyPasswordView = UIImageView(image: Image.keyPassword()!.withTintColor(Color.inactiveIconTextField()!))

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

    private func setupUI() {
        backgroundColor = Color.inputTextfield()
        
        addTarget(self, action: #selector(changed), for: .editingChanged)
        
        autocorrectionType = .no

        layer.borderColor = Color.inactiveBorderTextField()!.cgColor
        layer.borderWidth = 2
        layer.cornerRadius = 8
        
        font = Font.dinRoundProMedi(size: 20.scale())
        
        leftViewMode = .always

        setupViewingPasswordButton()
    }
    
    private func setupViewingPasswordButton() {
        let image = Image.openPasswordSee()!.withTintColor(Color.inactiveRightIconTextField()!)
        viewingPassword.setImage(image, for: .normal)
        viewingPassword.addTarget(self, action: #selector(viewingPasswordTap), for: .touchUpInside)
    }

    func configure(with placeholder: String,
                   type: TextFieldType) {
        attributedPlaceholder = NSAttributedString(
            string: placeholder,
            attributes: [
                .font: Font.dinRoundProMedi(size: 20.scale())!,
                .foregroundColor: Color.commonText()!
            ])
        
        switch type {
            case .nickname:
                leftView = profileView
            case .phoneNumber:
                leftView = phoneView
                keyboardType = .phonePad
            case .mail:
                leftView = mailView
                keyboardType = .emailAddress
            case .password:
                isSecureTextEntry = true
                leftView = keyPasswordView
                rightView = viewingPassword
                rightViewMode = .always
            case .name, .surname:
                leftView = initials
            case .dateOfBirth:
                leftView = dateOfBirth
                keyboardType = .phonePad
        }
        
        textFieldType = type
    }
    
    func changeState(with state: TextFieldState) {
        stateTextField = state
        switch state {
            case .inactive:
                layer.borderColor = Color.inactiveBorderTextField()!.cgColor
                textColor = .white
                profileView.image = profileView.image?.withTintColor(Color.inactiveIconTextField()!)
                initials.image = initials.image?.withTintColor(Color.inactiveIconTextField()!)
                dateOfBirth.image = dateOfBirth.image?.withTintColor(Color.inactiveIconTextField()!)
                phoneView.image = phoneView.image?.withTintColor(Color.inactiveIconTextField()!)
                keyPasswordView.image = keyPasswordView.image?.withTintColor(Color.inactiveIconTextField()!)

                let color = isSecureTextEntry ? Color.inactiveRightIconTextField()! : Color.activeIconTextField()!
                viewingPassword.setImage(viewingPassword.currentImage?.withTintColor(color), for: .normal)
            case .incorrect:
                layer.borderColor = Color.incorrectBorderTextField()!.cgColor
                textColor = Color.incorrectText()
                profileView.image = profileView.image?.withTintColor(Color.incorrectIconTextField()!)
                initials.image = initials.image?.withTintColor(Color.incorrectIconTextField()!)
                dateOfBirth.image = dateOfBirth.image?.withTintColor(Color.incorrectIconTextField()!)
                phoneView.image = phoneView.image?.withTintColor(Color.incorrectIconTextField()!)
                keyPasswordView.image = keyPasswordView.image?.withTintColor(Color.incorrectIconTextField()!)
                viewingPassword.setImage(viewingPassword.currentImage?.withTintColor(Color.incorrectIconTextField()!), for: .normal)
            default:
                layer.borderColor = state == .active ? Color.activeBorderTextField()!.cgColor : Color.haveTextBorderTextField()!.cgColor
                textColor = .white
                profileView.image = profileView.image?.withTintColor(Color.activeIconTextField()!)
                initials.image = initials.image?.withTintColor(Color.activeIconTextField()!)
                dateOfBirth.image = dateOfBirth.image?.withTintColor(Color.activeIconTextField()!)
                phoneView.image = phoneView.image?.withTintColor(Color.activeIconTextField()!)
                keyPasswordView.image = keyPasswordView.image?.withTintColor(Color.activeIconTextField()!)
                viewingPassword.setImage(viewingPassword.currentImage?.withTintColor(Color.activeIconTextField()!), for: .normal)
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        changeState(with: stateTextField)
    }
    
    @objc private func changed() {
        _delegate?.actionTextInput()
    }
}

// MARK: - Override
extension MainTextField {
    override var text: String? {
        didSet {
            changeState(with: stateTextField)
        }
    }
    
    override func textRect(forBounds bounds: CGRect) -> CGRect {
        var rect = super.textRect(forBounds: bounds)
        rect.origin.x += 19.scale()
        rect.size.width -= (19*3).scale()
        return rect
    }
    
    override func editingRect(forBounds bounds: CGRect) -> CGRect {
        return textRect(forBounds: bounds)
    }
    
    override func leftViewRect(forBounds bounds: CGRect) -> CGRect {
        var rect = super.leftViewRect(forBounds: bounds)
        rect.origin.x += 19.scale()
        
        return rect
    }
    
    override func rightViewRect(forBounds bounds: CGRect) -> CGRect {
        var rect = super.rightViewRect(forBounds: bounds)
        rect.origin.x -= 19.scale()
        return rect
    }
}

// MARK: - Viewing Button
private extension MainTextField {
    @objc func viewingPasswordTap() {
        isSecureTextEntry = isSecureTextEntry ? false : true
        let openEye: UIImage = Image.openPasswordSee()!
        let closeEye = Image.offPasswordSee()!.withTintColor(Color.activeIconTextField()!)
        
        let color = stateTextField == .inactive ? Color.inactiveRightIconTextField()! : Color.activeIconTextField()!
        openEye.withTintColor(color)

        let image = isSecureTextEntry ? openEye : closeEye
        viewingPassword.setImage(image, for: .normal)
    }
}

// MARK: - Delegate
extension MainTextField: UITextFieldDelegate {
    
    func getState() -> TextFieldState {
        return stateTextField
    }
    
    func textFieldDidBeginEditing(_ textField: UITextField) {
        becomeFirstResponder()
        changeState(with: .active)
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        resignFirstResponder()
        
        guard let text = text else {
            changeState(with: .inactive)
            return true
        }
        
        text.count > 0 ? changeState(with: .haveText) : changeState(with: .inactive)
        _delegate?.actionTextInput()
        return true
    }
    
    func textField(_ textField: UITextField, shouldChangeCharactersIn range: NSRange, replacementString string: String) -> Bool {
        defer {
            _delegate?.actionTextInput()
        }
        
        let location = limitedTextLength - 1
        
        if range.location > location || (range.location < location && textField.text?.count == limitedTextLength) {
            return false
        } else {
            return true
        }
    }

    func textFieldShouldClear(_ textField: UITextField) -> Bool {
        _delegate?.actionTextInput()
        return true
    }

    func textFieldDidEndEditing(_ textField: UITextField, reason: UITextField.DidEndEditingReason) {
        resignFirstResponder()

        guard let text = textField.text else { return }

        switch textFieldType {
            case .nickname:
                text.count >= 2 ? changeState(with: .haveText) : (text.count == 0 ? changeState(with: .inactive) : changeState(with: .incorrect))
            case .mail:
                if text.isEmpty {
                    changeState(with: .inactive)
                } else if text.makeValidEmail() == nil {
                    changeState(with: .incorrect)
                } else if text.count > 0 {
                    changeState(with: .haveText)
                }
            default:
                text.count == 0 ? changeState(with: .inactive) : changeState(with: .haveText)
        }
    }
}

extension MainTextField {
    func setDelegate(_ delegate: MainTextFieldDelegate) {
        _delegate = delegate
    }
}
