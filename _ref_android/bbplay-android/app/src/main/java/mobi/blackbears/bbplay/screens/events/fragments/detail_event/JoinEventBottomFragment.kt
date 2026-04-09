package mobi.blackbears.bbplay.screens.events.fragments.detail_event

import android.os.Bundle
import android.view.View
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.extensions.setBlockingClickListener
import mobi.blackbears.bbplay.common.fragment.BindingBottomFragment
import mobi.blackbears.bbplay.databinding.BottomFragmentJoinToEventBinding

class JoinEventBottomFragment :
    BindingBottomFragment<BottomFragmentJoinToEventBinding>(BottomFragmentJoinToEventBinding::inflate) {

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.btnOkInJoinEvent.setBlockingClickListener {
            findNavController().navigateUp()
        }
    }
}