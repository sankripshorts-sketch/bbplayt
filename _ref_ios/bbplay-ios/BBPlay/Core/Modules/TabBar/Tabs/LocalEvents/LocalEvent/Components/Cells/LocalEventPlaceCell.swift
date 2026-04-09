import Foundation
import SnapKit

final class LocalEventPlaceCell: BaseCollectionCell {
    
    private let cupImageView = UIImageView()
    
    private let leftLaurImageView = UIImageView()
    private let rightLaurImageView = UIImageView()
    
    private let placeView = UIView()
    private let rewardCountView = UIView()
    
    private let placeLabel = UILabel()
    private let rewardLabel = UILabel()
    
    override func setupUI() {
        setupRewardCountView()
        setupPlaceView()
        setupRewardLabel()
        setupLeftLaur()
        setupRightLaur()
        setupPlaceLabel()
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        cupImageView.image = nil
    }
}

// MARK: - Private -
private extension LocalEventPlaceCell {
    func setupRewardCountView() {
        rewardCountView.layer.cornerRadius = 4

        contentView.addSubview(rewardCountView)
        rewardCountView.snp.makeConstraints {
            $0.top.right.bottom.equalToSuperview()
            $0.width.equalTo(117.scaleIfNeeded())
        }
    }

    func setupPlaceView() {
        placeView.layer.cornerRadius = 4

        contentView.addSubview(placeView)
        placeView.snp.makeConstraints {
            $0.top.left.bottom.equalToSuperview()
            $0.right.equalTo(rewardCountView.snp.left).offset(-3.scaleIfNeeded())
        }
    }

    func setupRewardLabel() {
        rewardLabel.font = Font.dinRoundProBold(size: 16.scaleIfNeeded())
        rewardLabel.textColor = .white
        rewardCountView.addSubview(rewardLabel)

        rewardLabel.snp.makeConstraints {
            $0.centerX.equalToSuperview()
            $0.height.equalTo(21.scaleIfNeeded())
            $0.top.equalToSuperview().inset(11.scaleIfNeeded())
            $0.bottom.equalToSuperview().inset(10.scaleIfNeeded())
        }
    }

    func setupLeftLaur() {
        leftLaurImageView.image = Image.leftLaur()
        rewardCountView.addSubview(leftLaurImageView)
        
        leftLaurImageView.snp.makeConstraints {
            $0.centerY.equalTo(rewardLabel.snp.centerY)
            $0.right.equalTo(rewardLabel.snp.left).offset(CGFloat(-4.5).scaleIfNeeded())
            $0.height.equalTo(CGFloat(22.5).scaleIfNeeded())
        }
    }

    func setupRightLaur() {
        rightLaurImageView.image = Image.rightLaur()
        rewardCountView.addSubview(rightLaurImageView)
        
        rightLaurImageView.snp.makeConstraints {
            $0.centerY.equalTo(rewardLabel.snp.centerY)
            $0.left.equalTo(rewardLabel.snp.right).offset(3.scaleIfNeeded())
            $0.height.equalTo(CGFloat(22.5).scaleIfNeeded())
        }
    }

    func setupPlaceLabel() {
        placeLabel.font = Font.dinRoundProBold(size: 16.scaleIfNeeded())
        placeLabel.textColor = .white
        placeView.addSubview(placeLabel)

        placeLabel.snp.makeConstraints {
            $0.left.equalToSuperview().inset(18.scaleIfNeeded())
            $0.top.equalToSuperview().inset(11.scaleIfNeeded())
            $0.bottom.equalToSuperview().inset(10.scaleIfNeeded())
        }
    }

    func setupCupImageView() {
        cupImageView.image = Image.localEventCup()
        contentView.addSubview(cupImageView)
        
        cupImageView.snp.makeConstraints {
            $0.top.equalToSuperview().offset(-6.scaleIfNeeded())
            $0.left.equalToSuperview().offset(-17.scaleIfNeeded())
            $0.size.equalTo(36.scaleIfNeeded())
        }
    }
}

// MARK: - Public -
extension LocalEventPlaceCell {
    func update(with place: LocalEventPlace) {
        placeView.backgroundColor = place.color
        rewardCountView.backgroundColor = place.color
        placeLabel.text = place.text.uppercased()
        rewardLabel.text = place.price

        if place == .one { setupCupImageView() }
    }
}
