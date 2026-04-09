import Foundation
import UIKit
import SnapKit

extension ReservationView {
    final class BottomContainer: UIView {
        private let buttonsContainer = UIStackView()
        private let reserveButton = MainButton()
        private let reserveButtonTextContainer = UIView()
        private let reserveButtonDescription = UILabel()
        private let reserveButtonTitle = UILabel()
        private let reserveButtonLoader = ActivityIndicator(
            colors: [.white],
            lineWidth: 6.scale()
        )
        private let myReserveButton = MainButton()
        private let termsAndPricesLabel = UILabel()
        
        private let gradientLayer = CAGradientLayer()
        
        private var allPricesButtonAction: EmptyClosure?
        
        override init(frame: CGRect) {
            super.init(frame: frame)
            setupAppearance()
        }
        
        @available(*, unavailable)
        required init?(coder: NSCoder) { nil }
        
        override func didMoveToWindow() {
            super.didMoveToWindow()
            updateReserveButtonLoaderAfterChangeTab()
        }

        override func layoutSubviews() {
            super.layoutSubviews()
            gradientLayer.frame = bounds
        }
        
        func setReserveButtonAction(_ action: @escaping EmptyClosure) {
            reserveButton.setActionButton(action)
        }
        
        func setMyReservationButtonAction(_ action: @escaping EmptyClosure) {
            myReserveButton.setActionButton(action)
        }
        
        func setAllPriceButtonAction(_ action: @escaping EmptyClosure) {
            self.allPricesButtonAction = action
        }
        
        func setVisibleMyReserveButton(isVisible: Bool) {
            myReserveButton.isHidden = !isVisible
        }
        
        func updateButton(
            with description: String?,
            title: String?,
            state: ReservationButtonState
        ) {
            reserveButtonTextContainer.isHidden = state != .active
            reserveButtonLoader.isAnimating = state == .loading
            reserveButtonLoader.isHidden = state != .loading

            switch state {
                case .active:
                    reserveButton.configure(title: String())
                    reserveButtonDescription.text = description
                    reserveButtonTitle.text = title
                    reserveButton.setEnable(isEnabled: true)
                case .inactive:
                    reserveButton.configure(title: Localizable.reserve())
                    reserveButtonDescription.text = nil
                    reserveButtonTitle.text = nil
                    reserveButton.setEnable(isEnabled: false)
                case .loading:
                    reserveButtonDescription.text = nil
                    reserveButtonTitle.text = nil
                    reserveButton.setEnable(isEnabled: true) // костыль для зеленого бекграунда
                    reserveButton.setEnableWithoutBackgroundUpdate(isEnabled: false)
            }
        }
        
        // MARK: - Private
        private func updateReserveButtonLoaderAfterChangeTab() {
            if let window, window.isKeyWindow {
                reserveButtonLoader.isAnimating = reserveButtonLoader.isAnimating
            }
        }

        private func setupAppearance() {
            setupButtonsContainer()
            setupReserveButton()
            setupButtonContainer()
            setupReserveButtonDescription()
            setupReserveButtonTitle()
            setupReserveButtonLoader()
            setupMyReserveButton()
            // setupTermsAndPricesLabel()
            setupGradiendLayer()
        }

        private func setupButtonsContainer() {
            buttonsContainer.axis = .vertical
            buttonsContainer.distribution = .fillEqually
            buttonsContainer.spacing = 24.scale()
            
            addSubview(buttonsContainer)
            buttonsContainer.snp.makeConstraints {
                $0.horizontalEdges.equalToSuperview().inset(24.scale())
                $0.bottom.equalToSuperview().inset(24.scale()) // удалить, если надо вернуть setupTermsAndPricesLabel
                $0.top.equalToSuperview().inset(34.scale())
            }
        }
        
        private func setupReserveButton() {
            reserveButton.configure(title: Localizable.reserve())
            reserveButton.setEnable(isEnabled: false)
            
            buttonsContainer.addArrangedSubview(reserveButton)
            reserveButton.snp.makeConstraints {
                $0.horizontalEdges.equalToSuperview()
                $0.height.equalTo(58.scale())
            }
        }
        
        private func setupButtonContainer() {
            reserveButtonTextContainer.isHidden = true
            reserveButtonTextContainer.isUserInteractionEnabled = false
            
            reserveButton.addSubview(reserveButtonTextContainer)
            reserveButtonTextContainer.snp.makeConstraints {
                $0.top.equalToSuperview().inset(5.scale())
                $0.bottom.equalToSuperview().inset(10.scale())
                $0.centerX.equalToSuperview()
                $0.horizontalEdges.lessThanOrEqualToSuperview()
            }
        }
        
        private func setupReserveButtonDescription() {
            reserveButtonDescription.font = Font.dinRoundProBold(size: 16.scale())
            reserveButtonDescription.textColor = Color.reserveButtonTextSecondary()
            reserveButtonDescription.textAlignment = .center
            reserveButtonDescription.numberOfLines = 1
            reserveButtonDescription.minimumScaleFactor = 0.5
            reserveButtonDescription.adjustsFontSizeToFitWidth = true
            
            reserveButtonTextContainer.addSubview(reserveButtonDescription)
            reserveButtonDescription.snp.makeConstraints {
                $0.horizontalEdges.equalToSuperview()
            }
        }
        
        private func setupReserveButtonTitle() {
            reserveButtonTitle.font = Font.dinRoundProBold(size: 20.scale())
            reserveButtonTitle.textColor = Color.reserveButtonTextPrimary()
            reserveButtonTitle.textAlignment = .center
            reserveButtonTitle.numberOfLines = 1
            reserveButtonTitle.minimumScaleFactor = 0.5
            reserveButtonTitle.adjustsFontSizeToFitWidth = true
            
            reserveButtonTextContainer.addSubview(reserveButtonTitle)
            reserveButtonTitle.snp.makeConstraints {
                $0.bottom.horizontalEdges.equalToSuperview()
            }
        }
        
        private func setupReserveButtonLoader() {
            reserveButtonLoader.isAnimating = false
            reserveButtonLoader.isHidden = true
            
            reserveButton.addSubview(reserveButtonLoader)
            reserveButtonLoader.snp.makeConstraints {
                $0.center.equalToSuperview()
                $0.size.equalTo(42.scale())
            }
        }
        
        private func setupMyReserveButton() {
            myReserveButton.isHidden = true
            myReserveButton.configure(title: Localizable.myReserveButton())
            myReserveButton.setCustomColors(
                textColor: Color.myReserveButtonTextColor(),
                backgroundColor: Color.myReserveButtonBackground(),
                for: .normal
            )
            
            buttonsContainer.addArrangedSubview(myReserveButton)
            myReserveButton.snp.makeConstraints {
                $0.horizontalEdges.equalToSuperview()
                $0.height.equalTo(58.scale())
            }
        }
        
        private func setupTermsAndPricesLabel() {
            termsAndPricesLabel.isUserInteractionEnabled = true
            termsAndPricesLabel.attributedText = NSAttributedString(
                string: Localizable.termsAndPrices(),
                attributes: [
                    .font: Font.dinRoundProBold(size: 18.scale())!,
                    .foregroundColor: Color.termsAndPricesText()!,
                    .underlineStyle: NSUnderlineStyle.single.rawValue,
                    .underlineColor: Color.termsAndPricesText()!])
            
            addSubview(termsAndPricesLabel)
            termsAndPricesLabel.snp.makeConstraints {
                $0.top.equalTo(buttonsContainer.snp.bottom).offset(8.scale())
                $0.centerX.equalToSuperview()
                $0.height.equalTo(28.scale())
                $0.bottom.equalToSuperview().inset(24.scale())
            }
            
            let tap = UITapGestureRecognizer(target: self, action: #selector(allPricesButtonTap))
            termsAndPricesLabel.addGestureRecognizer(tap)
        }
        
        private func setupGradiendLayer() {
            gradientLayer.colors = [
                Color.background()!.cgColor,
                Color.background()!.withAlphaComponent(0).cgColor
            ]
            gradientLayer.locations = [0.82, 1]
            gradientLayer.endPoint = CGPoint(x: 0.5, y: 0)
            gradientLayer.startPoint = CGPoint(x: 0.5, y: 1)
            
            layer.insertSublayer(gradientLayer, at: 0)
        }
        
        @objc private func allPricesButtonTap() {
            allPricesButtonAction?()
        }
    }
    
}
