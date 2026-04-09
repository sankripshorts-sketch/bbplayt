import Foundation
import SnapKit

final class ReserveCardCell: BaseCollectionCell {
    private let dayWithTimeLabel = UILabel()
    
    private let placeContainer = UIView()
    private let placeComputerImage = UIImageView()
    private let placeDescription = UILabel()
    
    private let hourContainer = UIView()
    private let hourClockImage = UIImageView()
    private let hourDescription = UILabel()
    
    private let addressContainer = UIView()
    private let addressLocationImage = UIImageView()
    private let addressDescription = UILabel()
    
    private let borderLayer = CAGradientLayer()
    
    override func layoutSubviews() {
        super.layoutSubviews()
        guard let sublayers = layer.sublayers,
              !sublayers.contains(where: { $0 == borderLayer }) else { return }
        setupBorderLayer()
    }
    
    override func setupUI() {
        backgroundColor = Color.myReserveCardBackground()
        layer.cornerRadius = 8
        
        setupDayWithTimeLabel()
        
        setupPlaceContainer()
        setupPlaceComputerImage()
        setupPlaceDescription()
        
        setupHourContainer()
        setupHourClockImage()
        setupHourDescription()
        
        setupAddressContainer()
        setupAddressLocationImage()
        setupAddressDescription()
    }
}

// MARK: - Private -
private extension ReserveCardCell {
    func setupDayWithTimeLabel() {
        dayWithTimeLabel.font = Font.dinRoundProBold(size: 24.scale())
        addSubview(dayWithTimeLabel)
        
        dayWithTimeLabel.snp.makeConstraints {
            $0.top.left.equalToSuperview().inset(16.scale())
        }
    }
    
    func setupPlaceContainer() {
        addSubview(placeContainer)
        placeContainer.snp.makeConstraints {
            $0.top.equalTo(dayWithTimeLabel.snp.bottom).offset(12.scale())
            $0.left.equalToSuperview().inset(16.scale())
        }
    }
    
    func setupPlaceComputerImage() {
        placeComputerImage.image = Image.reservationPc()?.withTintColor(Color.commonText()!)
        placeContainer.addSubview(placeComputerImage)
        
        placeComputerImage.snp.makeConstraints {
            $0.left.equalToSuperview()
            $0.top.bottom.equalToSuperview().inset(2.scale())
            $0.size.equalTo(20.scale())
        }
    }
    
    func setupPlaceDescription() {
        placeDescription.font = Font.dinRoundProBold(size: 18.scale())
        placeDescription.textColor = Color.commonText()
        placeContainer.addSubview(placeDescription)
        
        placeDescription.snp.makeConstraints {
            $0.left.equalTo(placeComputerImage.snp.right).offset(4.scale())
            $0.centerY.equalTo(placeComputerImage.snp.centerY)
            $0.right.equalToSuperview()
        }
    }
    
    func setupHourContainer() {
        addSubview(hourContainer)
        hourContainer.snp.makeConstraints {
            $0.top.equalTo(dayWithTimeLabel.snp.bottom).offset(12.scale())
            $0.left.equalTo(placeContainer.snp.right).offset(16.scale())
        }
    }
    
    func setupHourClockImage() {
        hourClockImage.image = Image.reservationClock()?
            .withTintColor(Color.commonText()!,
                           renderingMode: .alwaysOriginal)
        hourContainer.addSubview(hourClockImage)
        
        hourClockImage.snp.makeConstraints {
            $0.left.equalToSuperview()
            $0.top.bottom.equalToSuperview().inset(2.scale())
            $0.size.equalTo(20.scale())
        }
    }
    
    func setupHourDescription() {
        hourDescription.font = Font.dinRoundProBold(size: 18.scale())
        hourDescription.textColor = Color.commonText()
        hourContainer.addSubview(hourDescription)
        
        hourDescription.snp.makeConstraints {
            $0.left.equalTo(hourClockImage.snp.right).offset(3.scale())
            $0.centerY.equalTo(hourClockImage.snp.centerY)
            $0.right.equalToSuperview()
        }
    }
    
    func setupAddressContainer() {
        addSubview(addressContainer)
        addressContainer.snp.makeConstraints {
            $0.top.equalTo(placeContainer.snp.bottom).offset(12.scale())
            $0.left.equalToSuperview().inset(16.scale())
            $0.bottom.equalToSuperview().inset(19.scale())
        }
    }
    
    func setupAddressLocationImage() {
        addressLocationImage.image = Image.reservationLocation()?
            .withTintColor(Color.commonText()!,
                           renderingMode: .alwaysOriginal)
        addressContainer.addSubview(addressLocationImage)
        
        addressLocationImage.snp.makeConstraints {
            $0.left.equalToSuperview()
            $0.top.bottom.equalToSuperview().inset(2.scale())
            $0.size.equalTo(20.scale())
        }
    }
    
    func setupAddressDescription() {
        addressDescription.font = Font.dinRoundProBold(size: 18.scale())
        addressDescription.textColor = Color.commonText()
        addressContainer.addSubview(addressDescription)
        
        addressDescription.snp.makeConstraints {
            $0.left.equalTo(addressLocationImage.snp.right).offset(4.scale())
            $0.centerY.equalTo(addressLocationImage.snp.centerY)
            $0.right.equalToSuperview()
        }
    }
    
    private func setupBorderLayer() {
        borderLayer.colors = [
            UIColor.white.withAlphaComponent(0).cgColor,
            UIColor.white.withAlphaComponent(0.16).cgColor
        ]
        
        let shape = CAShapeLayer()
        shape.lineWidth = 2.scaleIfNeeded()
        shape.path = UIBezierPath(roundedRect: self.bounds, cornerRadius: 8).cgPath
        shape.strokeColor = UIColor.clear.cgColor
        shape.strokeColor = UIColor.white.cgColor
        shape.fillColor = UIColor.clear.cgColor
        
        borderLayer.mask = shape
        borderLayer.frame = bounds
        layer.addSublayer(borderLayer)
    }
}

// MARK: - Public -
extension ReserveCardCell {
    func update(with cardInfo: MyReservePresenterImpl.CardModel) {
        dayWithTimeLabel.textColor = cardInfo.titleColor
        dayWithTimeLabel.text = cardInfo.title
        placeDescription.text = cardInfo.place
        hourDescription.text = cardInfo.duration
        addressDescription.text = cardInfo.address
    }
}
