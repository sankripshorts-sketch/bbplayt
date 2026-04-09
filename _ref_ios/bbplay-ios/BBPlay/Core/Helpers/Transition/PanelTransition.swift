import UIKit

class PanelTransition: NSObject, UIViewControllerTransitioningDelegate {
    
    // MARK: - Presentation controller
    private let driver = TransitionDriver()
    private let height: CGFloat
    
    init(height: CGFloat) {
        self.height = height
        super.init()
    }
    
    func presentationController(forPresented presented: UIViewController, presenting: UIViewController?, source: UIViewController) -> UIPresentationController? {
        driver.link(to: presented)
        
        let presentationController = DimmPresentationController(presentedViewController: presented,
                                                                presenting: presenting ?? source,
                                                                height: height)
        presentationController.driver = driver
        presentationController.setDimmRecognizer(target: presented) { [weak self] in
            self?.driver.dismiss()
        }
        
        return presentationController
    }
    
    func setDriverEnabled(with enabled: Bool) {
        driver.setDriverEnabled(with: enabled)
    }
    
    // MARK: - Animation
    func animationController(forPresented presented: UIViewController, presenting: UIViewController, source: UIViewController) -> UIViewControllerAnimatedTransitioning? {
        return PresentAnimation()
    }
    
    func animationController(forDismissed dismissed: UIViewController) -> UIViewControllerAnimatedTransitioning? {
        return DismissAnimation()
    }
    
    // MARK: - Interaction
    func interactionControllerForPresentation(using animator: UIViewControllerAnimatedTransitioning) -> UIViewControllerInteractiveTransitioning? {
        return driver
    }
    
    func interactionControllerForDismissal(using animator: UIViewControllerAnimatedTransitioning) -> UIViewControllerInteractiveTransitioning? {
        return driver
    }
}
