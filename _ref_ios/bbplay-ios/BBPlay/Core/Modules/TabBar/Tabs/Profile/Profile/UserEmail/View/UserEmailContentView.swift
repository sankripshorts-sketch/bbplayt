import Foundation
import UIKit
import SnapKit

final class UserEmailContentView: UIView {
    
    private let scrollView = UIScrollView()
 
    private let container = UIView()
    private let titleLabel = UILabel()
    private let descriptionLabel = UILabel()
    private let mailTextField = MainTextField()
    private let button = MainButton()

    private var textFieldValidateAction: ((_ text: String?) -> Void)?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { nil }

    func hideKeyboard(completion: @escaping EmptyClosure) {
        UIView.animate(
            withDuration: 0.3) { [self] in
                mailTextField.resignFirstResponder()
            } completion: { _ in
                completion()
            }
    }

    func setContentOffset(contentOffsetY: CGFloat, animated: Bool) {
        scrollView.setContentOffset(
            .init(
                x: .zero,
                y: contentOffsetY
            ),
            animated: true
        )
    }

    func setTextFieldValidateAction(_ action: @escaping ((_ text: String?) -> Void)) {
        textFieldValidateAction = action
    }

    func setButtonAction(_ action: @escaping (String?) -> Void) {
        button.setActionButton { [weak self] in
            action(
                self?.mailTextField.text
            )
        }
    }

    func updateButton(isEnabled: Bool) {
        button.setEnable(isEnabled: isEnabled)
    }

    private func setupUI() {
        backgroundColor = Color.background()
        addGestureRecognizer(
            UITapGestureRecognizer(target: self, action: #selector(backgroundTap))
        )

        setupScrollView()

        setupButton()

        setupTitleLabel()
        setupDesctiptionLabel()
        setupMailTextField()
        setupContainer()
    }

    @objc func backgroundTap() {
        mailTextField.resignFirstResponder()
    }

    private func setupScrollView() {
        scrollView.backgroundColor = Color.background()
        scrollView.isScrollEnabled = false
        scrollView.showsVerticalScrollIndicator = false
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.contentInsetAdjustmentBehavior = .never
        scrollView.bounces = false
        scrollView.delaysContentTouches = false
        
        addSubview(scrollView)
        scrollView.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
        scrollView.contentLayoutGuide.snp.makeConstraints {
            $0.edges.equalToSuperview()
        }
    }

    private func setupContainer() {
        scrollView.addSubview(container)
        container.snp.makeConstraints {
            $0.horizontalEdges.equalTo(
                scrollView.contentLayoutGuide.snp.horizontalEdges
            ).inset(24.scale())
            $0.bottom.equalTo(button.snp.top).offset(-32.scale())
        }
    }

    private func setupTitleLabel() {
        titleLabel.text = Localizable.enterYouEmail()
        titleLabel.textColor = .white
        titleLabel.font = Font.dinRoundProBold(size: 28.scale())

        container.addSubview(titleLabel)
        titleLabel.snp.makeConstraints {
            $0.top.horizontalEdges.equalToSuperview()
            $0.height.equalTo(28.scale())
        }
    }
    
    private func setupDesctiptionLabel() {
        descriptionLabel.text = Localizable.sendedCheckOnEmailAfterPurchase()
        descriptionLabel.textColor = Color.onSecondary()
        descriptionLabel.font = Font.dinRoundProMedi(size: 20.scale())
        descriptionLabel.numberOfLines = 0

        container.addSubview(descriptionLabel)
        descriptionLabel.snp.makeConstraints {
            $0.top.equalTo(titleLabel.snp.bottom).offset(16.scale())
            $0.horizontalEdges.equalToSuperview()
        }
    }

    private func setupMailTextField() {
        mailTextField.configure(
            with: Localizable.email(),
            type: .mail
        )

        mailTextField.setDelegate(self)

        container.addSubview(mailTextField)
        mailTextField.snp.makeConstraints {
            $0.top.equalTo(descriptionLabel.snp.bottom).offset(32.scale())
            $0.horizontalEdges.equalToSuperview()
            $0.height.equalTo(58.scale())
            $0.bottom.equalToSuperview()
        }
    }

    private func setupButton() {
        button.configure(title: Localizable.next())
        scrollView.addSubview(button)
        button.snp.makeConstraints {
            $0.horizontalEdges.equalTo(
                scrollView.contentLayoutGuide.snp.horizontalEdges
            ).inset(24.scale())
            $0.bottom.equalTo(
                scrollView.contentLayoutGuide.snp.bottom
            ).inset(32.scale() + Self.safeAreaBottom)
            $0.height.equalTo(58.scale())
        }
    }

}

// MARK: - MainTextFieldDelegate -

extension UserEmailContentView: MainTextFieldDelegate {

    func actionTextInput() {
        textFieldValidateAction?(
            mailTextField.text
        )
    }

}
