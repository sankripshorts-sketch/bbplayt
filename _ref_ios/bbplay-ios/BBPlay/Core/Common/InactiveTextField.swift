import Foundation
import UIKit


final class InactiveTextField: UITextField {
    
    enum TextFieldType {
        case nickname
        case phoneNumber
        case mail
        case name
        case surname
        case dateOfBirth
    }
    
    private var textFieldType: TextFieldType = .nickname
    
    private let profileView = UIImageView(image: Image.nickname()!.withTintColor(Color.inactiveIconTextField()!))
    private let phoneView = UIImageView(image: Image.phone()!.withTintColor(Color.inactiveIconTextField()!))
    private let mailView = UIImageView(image: Image.mail()!.withTintColor(Color.inactiveIconTextField()!))
    private let initials = UIImageView(image: Image.nameCard()?.withTintColor(Color.inactiveIconTextField()!))
    private let dateOfBirth = UIImageView(image: Image.calendar()?.withTintColor(Color.inactiveIconTextField()!))
    private let keyPasswordView = UIImageView(image: Image.keyPassword()!.withTintColor(Color.inactiveIconTextField()!))
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
    
    private func setupUI() {
        backgroundColor = Color.notEditingTextField()
        
        autocorrectionType = .no
        isEnabled = false
        
        layer.borderColor = Color.notEditingTextField()!.cgColor
        layer.borderWidth = 2
        layer.cornerRadius = 8
        
        font = Font.dinRoundProMedi(size: 20.scale())
        textColor = Color.commonText()
        
        leftViewMode = .always
    }
    
    func configure(with placeholder: String,
                   type: TextFieldType) {
        switch type {
            case .nickname:
                leftView = profileView
            case .phoneNumber:
                leftView = phoneView
                keyboardType = .phonePad
            case .mail:
                leftView = mailView
            case .name, .surname:
                leftView = initials
            case .dateOfBirth:
                leftView = dateOfBirth
                keyboardType = .phonePad
        }

        textFieldType = type
    }
}

// MARK: - Override
extension InactiveTextField {
    
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
