import Foundation
import SnapKit

final class PriceBottomSheetViewImpl: UIView {
        
    private let topContainer = UIView()
    private let title = UILabel()
    private let adressLabel = UILabel()
    
    private let priceContainer = UIView()
    private let titlesContainer = UIStackView()
    private let priceTime = UILabel()
    private let gameZone = UILabel()
    private let bootCamp = UILabel()
    private let prices = UIStackView()

    private let button = MainButton()

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
        setupTopContainer()
        setupTitle()
        setupAdressLabel()
        setupPriceContainer()
        setupTitlesContainer()
        setupPriceTime()
        setupPrices()
        setupGameZone()
        setupBootCamp()
        setupButton()
    }

    private func setupTopContainer() {
        addSubview(topContainer)
        topContainer.snp.makeConstraints {
            $0.top.equalToSuperview().inset(43.scale())
            $0.centerX.equalToSuperview()
        }
    }
    
    private func setupTitle() {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.maximumLineHeight = 28
        paragraphStyle.minimumLineHeight = 28
        
        title.attributedText = NSMutableAttributedString(
            string: Localizable.nameClub(),
            attributes: [
                .paragraphStyle: paragraphStyle,
                .font: Font.dinRoundProBold(size: 28.scale())!,
                .foregroundColor: UIColor.white
            ])
        
        topContainer.addSubview(title)
        title.snp.makeConstraints {
            $0.top.centerX.equalToSuperview()
            $0.height.equalTo(28.scale())
        }
    }
    
    private func setupAdressLabel() {
        topContainer.addSubview(adressLabel)
        adressLabel.snp.makeConstraints {
            $0.top.equalTo(title.snp.bottom).offset(4.scale())
            $0.centerX.bottom.equalToSuperview()
        }
    }

    private func setupPriceContainer() {
        addSubview(priceContainer)
        priceContainer.snp.makeConstraints {
            $0.top.equalTo(topContainer.snp.bottom).offset(24.scale())
            $0.left.right.equalToSuperview().inset(24.scaleIfNeeded())
        }
    }

    private func setupTitlesContainer() {
        titlesContainer.axis = .horizontal
        titlesContainer.spacing = 4
        titlesContainer.distribution = .equalSpacing
        
        priceContainer.addSubview(titlesContainer)
        titlesContainer.snp.makeConstraints {
            $0.top.equalToSuperview()
            $0.left.right.equalToSuperview()
        }
    }

    private func setupPriceTime() {
        priceTime.text = Localizable.time()
        priceTime.textAlignment = .center
        priceTime.textColor = Color.commonText()
        priceTime.font = Font.dinRoundProBold(size: 14.scale())
        
        titlesContainer.addArrangedSubview(priceTime)
        priceTime.snp.makeConstraints {
            $0.width.equalTo(85.scaleIfNeeded())
            $0.height.equalTo(18.scale())
        }
    }

    private func setupGameZone() {
        gameZone.text = Localizable.gameZone()
        gameZone.textAlignment = .center
        gameZone.textColor = Color.gameZoneGreen()
        gameZone.font = Font.dinRoundProBold(size: 14.scale())
        
        titlesContainer.addArrangedSubview(gameZone)
        gameZone.snp.makeConstraints {
            $0.width.equalTo(117.scaleIfNeeded())
            $0.height.equalTo(18.scale())
        }
    }

    private func setupBootCamp() {
        bootCamp.text = Localizable.bootCamp()
        bootCamp.textAlignment = .center
        bootCamp.textColor = Color.bootCampPink()
        bootCamp.font = Font.dinRoundProBold(size: 14.scale())
        
        titlesContainer.addArrangedSubview(bootCamp)
        bootCamp.snp.makeConstraints {
            $0.width.equalTo(117.scaleIfNeeded())
            $0.height.equalTo(18.scale())
        }
    }

    private func setupPrices() {
        prices.axis = .vertical
        prices.spacing = 4
        titlesContainer.distribution = .equalSpacing
        priceContainer.addSubview(prices)
        prices.snp.makeConstraints {
            $0.top.equalTo(titlesContainer.snp.bottom).offset(8.scale())
            $0.left.right.equalToSuperview()
        }
    }

    private func setupButton() {
        button.configure(title: Localizable.okey())

        addSubview(button)
        button.snp.makeConstraints {
            $0.top.equalTo(priceContainer.snp.bottom).offset(16.scale())
            $0.left.right.equalToSuperview().inset(24.scaleIfNeeded())
            $0.height.equalTo(58.scale())
            $0.bottom.equalToSuperview().inset(43.scale() + UIView.safeAreaBottom)
        }
    }
}

extension PriceBottomSheetViewImpl {
    func update(with info: PriceInfo, adress: String) {
        updateAdress(with: adress)
        info.priceList.forEach { item in
            let priceView = PriceView()
            priceView.update(hour: item.title,
                             timeDay: item.title,
                             time: item.time,
                             gameZonePrice: item.priceGameZone ?? "",
                             bootCampPrice: item.priceBootCamp ?? "",
                             isTimeDay: item.type == .morning || item.type == .night)
            prices.addArrangedSubview(priceView)
        }
    }

    func setAction(_ action: @escaping EmptyClosure) {
        button.setActionButton(action)
    }
}

private extension PriceBottomSheetViewImpl {
    func updateAdress(with adress: String) {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 0.78
        paragraphStyle.maximumLineHeight = 20
        paragraphStyle.minimumLineHeight = 20
        
        adressLabel.attributedText = NSMutableAttributedString(
            string: adress,
            attributes: [
                .paragraphStyle: paragraphStyle,
                .font: Font.dinRoundProBold(size: 16.scale())!,
                .foregroundColor: Color.commonText()!
            ])
    }
}
