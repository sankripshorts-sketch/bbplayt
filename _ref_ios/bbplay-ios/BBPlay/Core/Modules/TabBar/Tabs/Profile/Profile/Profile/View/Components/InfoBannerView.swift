import Foundation
import SnapKit

final class InfoBannerView: UIView {

    private let mainLabel = UILabel()
    private let labelContainer = UIView()
    private let replenishmentLabel = UILabel()
    private let bonusLabel = UILabel()
    private let imageContainer = UIView()
    private let firstImageView = BonusImage()
    private let secondImageView = BonusImage()
    private let thirdImageView = BonusImage()
    private let fourthImageView = BonusImage()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    @available(*, unavailable)
    required init?(coder: NSCoder) {
        assertionFailure("init(coder:) has not been implemented")
        return nil
    }
}

// MARK: - Private extension -
private extension InfoBannerView {
    func setupUI() {
        setupMainLabel()
        setupLabelContainer()
        setupReplenishmentLabel()
        setupBonusLabel()
        setupImageContainer()
        setupFirstImage()
        setupSecondImage()
        setupThirdImage()
        setupFourthImage()
    }
    
    func setupMainLabel() {
        mainLabel.text = Localizable.descriptionBonus()
        mainLabel.font = Font.dinRoundProBold(size: 16.scale())
        mainLabel.textColor = Color.currentPlayerColor()
        mainLabel.textAlignment = .center
        mainLabel.numberOfLines = 0
        
        addSubview(mainLabel)
        mainLabel.snp.makeConstraints {
            $0.top.equalToSuperview().inset(24.scale())
            $0.centerX.equalToSuperview()
        }
    }
    
    func setupLabelContainer() {
        addSubview(labelContainer)
        labelContainer.snp.makeConstraints {
            $0.left.equalToSuperview().offset(44.scale())
            $0.right.equalToSuperview().inset(45.scale())
            $0.top.equalTo(mainLabel.snp.bottom).offset(8.scale())
        }
    }
    
    func setupReplenishmentLabel() {
        replenishmentLabel.text = Localizable.replenishment()
        replenishmentLabel.font = Font.dinRoundProBold(size: 14.scale())
        
        labelContainer.addSubview(replenishmentLabel)
        replenishmentLabel.snp.makeConstraints {
            $0.top.bottom.equalToSuperview()
            $0.centerX.equalTo(labelContainer.snp.right).multipliedBy(0.25)
        }
    }
    
    func setupBonusLabel() {
        bonusLabel.text = Localizable.bonus()
        bonusLabel.font = Font.dinRoundProBold(size: 14.scale())
        
        labelContainer.addSubview(bonusLabel)
        bonusLabel.snp.makeConstraints {
            $0.top.bottom.equalToSuperview()
            $0.centerX.equalTo(labelContainer.snp.right).multipliedBy(0.75)
        }
    }
    
    func setupImageContainer() {
        addSubview(imageContainer)
        imageContainer.snp.makeConstraints {
            $0.left.equalToSuperview().inset(44.scale())
            $0.right.equalToSuperview().inset(45.scale())
            $0.top.equalTo(labelContainer.snp.bottom).offset(8.scale())
            $0.bottom.equalToSuperview().inset(24.scale())
        }
    }
    
    func setupFirstImage() {
        firstImageView.setImageAndLabels(
            image: Image.firstLineView()!,
            forSumText: "> 300 ₽",
            bonusSumText: "100 ₽",
            bonusSumTextColor: Color.firstBonusViewTextColor()!
        )
        
        imageContainer.addSubview(firstImageView)
        firstImageView.snp.makeConstraints {
            $0.top.equalToSuperview()
            $0.left.right.equalToSuperview()
        }
    }
    
    func setupSecondImage() {
        secondImageView.setImageAndLabels(
            image: Image.secondLineView()!,
            forSumText: "> 1 000 ₽",
            bonusSumText: "300 ₽",
            bonusSumTextColor: Color.secondBonusViewTextColor()!
        )
        
        imageContainer.addSubview(secondImageView)
        secondImageView.snp.makeConstraints {
            $0.top.equalTo(firstImageView.snp.bottom).offset(4.scale())
            $0.left.right.equalToSuperview()
        }
    }
    
    func setupThirdImage() {
        thirdImageView.setImageAndLabels(
            image: Image.thirdLineView()!,
            forSumText: "> 5 000 ₽",
            bonusSumText: "1 000 ₽",
            bonusSumTextColor: Color.thirdBonusViewTextColor()!
        )
        
        imageContainer.addSubview(thirdImageView)
        thirdImageView.snp.makeConstraints {
            $0.top.equalTo(secondImageView.snp.bottom).offset(4.scale())
            $0.left.right.equalToSuperview()
        }
    }
    
    func setupFourthImage() {
        fourthImageView.setImageAndLabels(
            image: Image.fourthLineView()!,
            forSumText: "> 10 000 ₽",
            bonusSumText: "3 000 ₽",
            bonusSumTextColor: Color.fourthBonusViewTextColor()!
        )
        
        imageContainer.addSubview(fourthImageView)
        fourthImageView.snp.makeConstraints {
            $0.top.equalTo(thirdImageView.snp.bottom).offset(4.scale())
            $0.left.right.equalToSuperview()
            $0.bottom.equalToSuperview()
        }
    }
}
