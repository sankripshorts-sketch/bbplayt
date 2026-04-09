package mobi.blackbears.bbplay.screens.leaderboard.fragments.leaders

import android.os.Bundle
import android.view.View
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import mobi.blackbears.bbplay.common.extensions.observe
import mobi.blackbears.bbplay.common.fragment.BindingBottomFragment
import mobi.blackbears.bbplay.databinding.BottomFragmentSortingLeadersBinding


class StatisticDialogFragment :
    BindingBottomFragment<BottomFragmentSortingLeadersBinding>(BottomFragmentSortingLeadersBinding::inflate) {

    private val viewModel by viewModels<LeadersViewModel>({ parentFragmentManager.fragments[0] })

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setOptions()
        setButtonOk()
    }

    private fun setOptions() {
        with(binding.picker) {
            viewModel.optionsSortFlow.observe(viewLifecycleOwner) {
                val size = it.size - 1
                minValue = 0
                maxValue = size
                wrapSelectorWheel = false
                displayedValues = it.map(::getString).toTypedArray()
                wrapSelectorWheel = true
                if (size >= 5) {
                    wheelItemCount = 5
                }
            }

            viewModel.pickerCurrentValue.observe(viewLifecycleOwner, observer = ::setValue)
        }
    }

    private fun setButtonOk() {
        binding.btnChoiceSort.setOnClickListener {
            viewModel.onSortClicked(binding.picker.value)
            findNavController().navigateUp()
        }
    }

}