import UIKit

class PresentationController: UIPresentationController {
    
    private let height: CGFloat
    
    init(presentedViewController: UIViewController,
                  presenting presentingViewController: UIViewController?,
                  height: CGFloat) {
        self.height = height
        super.init(presentedViewController: presentedViewController, presenting: presentingViewController)
    }
    
    override var shouldPresentInFullscreen: Bool {
        return false
    }
    
    override var frameOfPresentedViewInContainerView: CGRect {
        let bounds = containerView!.bounds
        let height = bounds.height - height
        return CGRect(x: 0,
                      y: height,
                      width: bounds.width,
                      height: self.height)
    }
    
    override func presentationTransitionWillBegin() {
        super.presentationTransitionWillBegin()
        
        containerView?.addSubview(presentedView!)
        
    }
    
    override func containerViewDidLayoutSubviews() {
        super.containerViewDidLayoutSubviews()
        
        presentedView?.frame = frameOfPresentedViewInContainerView
    }
    
    var driver: TransitionDriver!
    override func presentationTransitionDidEnd(_ completed: Bool) {
        super.presentationTransitionDidEnd(completed)
        
        if completed {
            driver.direction = .dismiss
        }
    }
}
