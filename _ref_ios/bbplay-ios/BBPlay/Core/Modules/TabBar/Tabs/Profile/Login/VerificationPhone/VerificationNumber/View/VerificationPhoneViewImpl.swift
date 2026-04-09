import Foundation
import SnapKit

final class VerificationPhoneViewImpl: UIView {
    private var textFieldAction: ((String) -> Void)?
    private var furtherAction: ((String) -> Void)?
    
    private var containerView = UIStackView()
    private let titleLabel = UILabel()
    private let descriptionLabel = UILabel()
    private let phoneTextField = PhoneTextField()
    private let furtherButton = MainButton()
    
    private var keyboardHeight: CGFloat = 0
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        setupAction()
    }
        
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
}

// MARK: - Private Extension -
private extension VerificationPhoneViewImpl {
    func setupUI() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(hideTextField))
        addGestureRecognizer(tap)
        isUserInteractionEnabled = true
        backgroundColor = Color.background()
        
        setupContainerView()
        setupTitleLabel()
        setupDescriptionLabel()
        setupPhoneTextField()
        setupButton()
    }
    
    @objc func hideTextField() {
        phoneTextField.resignFirstResponder()
    }
    
    func setupContainerView() {
        containerView.isUserInteractionEnabled = true
        containerView.axis = .vertical
        containerView.spacing = 32.scale()
        containerView.distribution = .fill
        
        addSubview(containerView)
        containerView.snp.makeConstraints {
            $0.left.right.equalToSuperview()
            $0.bottom.equalToSuperview().inset(76.scale())
        }
    }
    
    func setupButton() {
        furtherButton.setEnable(isEnabled: false)
        furtherButton.configure(title: Localizable.fartherButton())
        
        containerView.addArrangedSubview(furtherButton)
        furtherButton.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(58.scale())
        }
    }
    
    func setupPhoneTextField() {
        phoneTextField.isUserInteractionEnabled = true
        phoneTextField.becomeFirstResponder()
        phoneTextField.configure(with: Localizable.phone(), type: .phoneNumber)
        phoneTextField.setDelegate(self)
        
        containerView.addArrangedSubview(phoneTextField)
        phoneTextField.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(58.scale())
        }
    }
    
    func setupDescriptionLabel() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.minimumLineHeight = 20.scale()
        paragraphStyle.maximumLineHeight = 20.scale()
        
        descriptionLabel.attributedText = NSAttributedString(
            string: Localizable.verificationDescription(),
            attributes: [
                .font: Font.dinRoundProMedi(size: 20.scale())!,
                .foregroundColor: R.color.newsButtonText()!,
                .paragraphStyle: paragraphStyle
            ])
        descriptionLabel.numberOfLines = 0
        descriptionLabel.lineBreakMode = .byWordWrapping
        
        containerView.addArrangedSubview(descriptionLabel)
        descriptionLabel.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).inset(-16.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
        }
    }
    
    func setupTitleLabel() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.minimumLineHeight = 28.scale()
        paragraphStyle.maximumLineHeight = 28.scale()
        
        titleLabel.attributedText = NSAttributedString(
            string: Localizable.verificationTitle(),
            attributes: [
                .font: Font.dinRoundProBold(size: 28.scale())!,
                .paragraphStyle: paragraphStyle
            ])
        titleLabel.numberOfLines = 0
        
        containerView.addArrangedSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.left.right.equalToSuperview().inset(24.scale())
        }
    }
}

// MARK: - Actions -
extension VerificationPhoneViewImpl {
    func setupAction() {
        furtherButton.setActionButton { [weak self] in
            guard let phone = self?.phoneTextField.text else { return }
            self?.furtherAction?(phone)
        }
    }
    
    func setTextFieldAction(_ action: @escaping((String) -> Void)) {
        self.textFieldAction = action
    }
    
    func setFurtherAction(_ action: @escaping((String) -> Void)) {
        self.furtherAction = action
    }
    
    func updateScrollPosition(with height: CGFloat) {
        UIView.animate(withDuration: 0.15) { [self] in
            containerView.snp.updateConstraints {
                $0.bottom.equalToSuperview().inset(height + 15.scale())
            }
            layoutIfNeeded()
        }
    }
    
    func resetScrollPosition() {
        UIView.animate(withDuration: 0.15) { [self] in
            containerView.snp.updateConstraints {
                $0.bottom.equalToSuperview().inset(76.scale())
            }
            layoutIfNeeded()
        }
    }
    
    func updateTextField(_ phone: String) {
        phoneTextField.text = phone
    }
    
    func updateButton(_ isEnable: Bool) {
        furtherButton.setEnable(isEnabled: isEnable)
        furtherButton.layoutSubviews()
    }
}

// MARK: - MainTextFieldDelegate -
extension VerificationPhoneViewImpl: MainTextFieldDelegate {
    func actionTextInput() {
        guard let phone = phoneTextField.text else { return }
        textFieldAction?(phone)
    }
}
