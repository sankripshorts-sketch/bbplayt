import Foundation
import SnapKit

final class PriceView: UIView {
    
    private let mainContainer = UIStackView()
    
    private let timeContainer = UIView()
    private let hoursTime = UILabel()
    
    private let timeDay = UILabel()
    private let time = UILabel()
    
    private let gameZoneContainer = UIView()
    private let gameZonePrice = UILabel()
    
    private let bootCampContainer = UIView()
    private let bootCampPrice = UILabel()
    
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
        setupMainContainer()
        setupTimeContainer()
        setupGameZoneContainer()
        setupBootCampContainer()

        setupGameZonePrice()
        setupBootCampPrice()
    }
    
    private func setupTimeDays() {
        setupTimeDay()
        setupTime()
    }
    
    private func setupMainContainer() {
        mainContainer.axis = .horizontal
        mainContainer.spacing = 4.scaleIfNeeded()
        mainContainer.distribution = .equalSpacing
        
        addSubview(mainContainer)
        mainContainer.snp.makeConstraints {
            $0.edges.equalToSuperview()
            $0.height.equalTo(42.scaleIfNeeded())
        }
    }
    
    private func setupTimeContainer() {
        timeContainer.backgroundColor = Color.hoursBackground()
        timeContainer.layer.cornerRadius = 4
        mainContainer.addArrangedSubview(timeContainer)
        
        timeContainer.snp.makeConstraints {
            $0.width.equalTo(85.scaleIfNeeded())
        }
    }
    
    private func setupHoursTime() {
        hoursTime.font = Font.dinRoundProBold(size: 16.scale())
        hoursTime.textColor = .white
        
        timeContainer.addSubview(hoursTime)
        hoursTime.snp.makeConstraints {
            $0.centerX.centerY.equalToSuperview()
        }
    }
    
    private func setupTimeDay() {
        timeDay.textColor = .white
        timeDay.font = Font.dinRoundProBold(size: 16.scale())
        
        timeContainer.addSubview(timeDay)
        timeDay.snp.makeConstraints {
            $0.top.equalToSuperview().inset(3.scale())
            $0.centerX.equalToSuperview()
        }
    }
    
    private func setupTime() {
        time.textColor = Color.commonText()
        time.font = Font.dinRoundProBold(size: 12.scale())

        timeContainer.addSubview(time)
        time.snp.makeConstraints {
            $0.top.equalTo(timeDay.snp.bottom)
            $0.centerX.equalToSuperview()
        }
    }
    
    private func setupGameZoneContainer() {
        gameZoneContainer.backgroundColor = Color.gameZoneBackground()
        gameZoneContainer.layer.cornerRadius = 4
        mainContainer.addArrangedSubview(gameZoneContainer)
        
        gameZoneContainer.snp.makeConstraints {
            $0.width.equalTo(117.scaleIfNeeded())
        }
    }
    
    private func setupGameZonePrice() {
        gameZonePrice.font = Font.dinRoundProBold(size: 16.scale())
        gameZonePrice.textColor = .white
        
        gameZoneContainer.addSubview(gameZonePrice)
        gameZonePrice.snp.makeConstraints {
            $0.centerX.centerY.equalToSuperview()
        }
    }
    
    private func setupBootCampContainer() {
        bootCampContainer.backgroundColor = Color.bootCampBackground()
        bootCampContainer.layer.cornerRadius = 4
        mainContainer.addArrangedSubview(bootCampContainer)
        
        bootCampContainer.snp.makeConstraints {
            $0.width.equalTo(117.scaleIfNeeded())
        }
    }
    
    private func setupBootCampPrice() {
        bootCampPrice.font = Font.dinRoundProBold(size: 16.scale())
        bootCampPrice.textColor = .white
        
        bootCampContainer.addSubview(bootCampPrice)
        bootCampPrice.snp.makeConstraints {
            $0.centerX.centerY.equalToSuperview()
        }
    }

    func update(hour: String,
                timeDay: String,
                time: String,
                gameZonePrice: String,
                bootCampPrice: String,
                isTimeDay: Bool) {
        hoursTime.text = hour
        self.gameZonePrice.text = Localizable.rub(gameZonePrice)
        self.bootCampPrice.text = Localizable.rub(bootCampPrice)
        
        self.time.text = time
        self.timeDay.text = timeDay
        
        isTimeDay ? setupTimeDays() : setupHoursTime()
    }
}
