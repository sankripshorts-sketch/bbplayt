import Foundation
import UIKit

final class PlayerView: ComingSoonView {
    
    override func setupBackground() {
        super.setupBackground()
        background.image = Image.playerViewBackground()
    }
    
    override func setupTitle() {
        super.setupTitle()
        title.text = Localizable.participant()
        title.textColor = Color.participantTextColor()
    }
}
