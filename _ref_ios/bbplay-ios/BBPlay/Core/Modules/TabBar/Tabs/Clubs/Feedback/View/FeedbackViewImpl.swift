import Foundation
import UIKit

final class FeedbackViewImpl: UIView {
    
    private var checkTextFieldAction: ((String) -> Void)?
    private var sendFeedbackAction: ((String) -> Void)?
    
    private let titleLabel = UILabel()
    private let feedbackTextField = FeedbackTextField()
    private let sendButton = MainButton()
    
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
    
    private func setupUI() {
        backgroundColor = Color.background()
        setupTitleLabel()
        setupTextField()
        setupSendButton()
    }
    
    private func setupTitleLabel() {
        titleLabel.text = Localizable.feedbackTitle()
        titleLabel.font = Font.dinRoundProBold(size: 32.scale())
        titleLabel.textColor = .white
        titleLabel.adjustsFontSizeToFitWidth = true
        addSubview(titleLabel)
        
        titleLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(104.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(42.scale())
        }
    }
    
    private func setupTextField() {
        feedbackTextField.setDelegate(self)
        addSubview(feedbackTextField)
        
        feedbackTextField.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(185.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(45.scale())
        }
    }
    
    private func setupSendButton() {
        sendButton.configure(title: Localizable.send())
        sendButton.setEnable(isEnabled: false)
        addSubview(sendButton)
        
        sendButton.snp.makeConstraints {
            $0.top.equalTo(feedbackTextField.snp.bottom).offset(32.scale())
            $0.left.right.equalToSuperview().inset(24.scale())
            $0.height.equalTo(58.scale())
        }
    }
    
    func updateButton(_ isEnabled: Bool) {
        sendButton.setEnable(isEnabled: isEnabled)
        sendButton.layoutSubviews()
    }
    
    private func setupAction() {
        sendButton.setActionButton { [weak self] in
            guard let text = self?.feedbackTextField.text else {
                logger.error("text is nil")
                assertionFailure()
                return
            }
            self?.sendFeedbackAction?(text)
            self?.feedbackTextField.text = ""
            self?.updateButton(false)
        }
    }
}

// MARK: - Public -
extension FeedbackViewImpl {
    func setSendAction(_ action: @escaping ((String) -> Void)) {
        sendFeedbackAction = action
    }
    
    func setCheckTextFieldAction(_ action: @escaping ((String) -> Void)) {
        checkTextFieldAction = action
    }
    
    func setFirstResponder() {
        feedbackTextField.becomeFirstResponder()
    }
}

extension FeedbackViewImpl: MainTextFieldDelegate {
    func actionTextInput() {
        guard let feedback = feedbackTextField.text else { return }
        checkTextFieldAction?(feedback)
    }
}
