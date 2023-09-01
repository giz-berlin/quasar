import { computed, h, nextTick, reactive, ref, watchEffect } from 'vue'

import { createComponent } from '../../utils/private/create.js'
import { isObject } from '../../utils/is.js'
import useField, { useFieldState, useFieldEmits, useFieldProps } from '../../composables/private/use-field.js'

import QTokenizedFilterTerm from './QTokenizedFilterTerm.js'
import QItem from '../item/QItem.js'
import QItemSection from '../item/QItemSection.js'
import QIcon from '../icon/QIcon.js'
import QItemLabel from '../item/QItemLabel.js'

export default createComponent({
  name: 'QTokenizedFilter',

  inheritAttrs: false,

  props: {
    ...useFieldProps,
    modelValue: {
      type: Array
    },

    /**
     * Example:
     *
     * ```js
     * {
     *   author: {
     *     label: 'Author',
     *     icon: 'person',
     *     operators: {
     *       is: {
     *         label: 'is',
     *         selectMultiple: boolean, // whether this operator allows to select multiple options.
     *       }
     *     ],
     *     // this can also be a function returning options as an array (or promise that resolves to an array)
     *     // Example: `options: (operator) => new Promise((resolve) => setTimeout(() => resolve(['a', 'b', 'c']), 1000))`
     *     options: ['a', 'b', 'c']
     *   }
     * }
     * ```
     */
    validFilters: {
      type: Object,
      required: true,
      validator (value) {
        function isOperatorValid (operator) {
          if (!isObject(operator)) {
            return false
          }
          return !!operator.label && typeof operator.selectMultiple === 'boolean'
        }
        function isFilterValid (filter) {
          if (!isObject(filter)) {
            return false
          }
          if (!isObject(filter.operators) || Object.values(filter.operators).findIndex((operator) => !isOperatorValid(operator)) > -1) {
            return false
          }
          return true
        }
        return !Object.values(value).find((filter) => !isFilterValid(filter))
      }
    },

    optionsDark: {
      type: Boolean,
      default: null
    }
  },

  emits: [
    ...useFieldEmits,
    'focus', 'blur'
  ],

  setup (props, { slots, emit }) {
    const state = useFieldState()

    const openPopups = ref(0)
    const termRefs = reactive([])

    console.log('setup')

    const typeOptions = computed(() =>
      Object.entries(props.validFilters).map(([ id, filter ]) => ({
        ...filter,
        id
      }))
    )
    const operatorsForTypes = computed(() =>
      Object.entries(props.validFilters).reduce((acc, [ filterId, filter ]) => {
        acc[ filterId ] = Object.entries(filter.operators).map(([ id, operator ]) => ({
          ...operator,
          id
        }))
        return acc
      }, {})
    )

    // Make sure focus is handled correctly.
    watchEffect(() => {
      state.hasPopupOpen = openPopups.value > 0
    })

    const isOptionsDark = computed(() => (
      props.optionsDark === null
        ? state.isDark.value
        : props.optionsDark
    ))

    function isGroupFinished (group) {
      if (!Array.isArray(group)) {
        console.warn('Invalid filter group detected.')
        return false
      }
      return group.length === 3 // type, operator, selection
    }

    const lastGroupIsFinished = computed(() => {
      if (!props.modelValue) {
        return true
      }
      if (props.modelValue.length < 1) {
        return true
      }
      return isGroupFinished(props.modelValue[ props.modelValue.length - 1 ])
    })

    function onPopupShow () {
      openPopups.value += 1
    }

    function onPopupHide () {
      openPopups.value -= 1
    }

    function switchToPreviousTerm (currentIdx) {
      const currentTermRef = termRefs[ currentIdx ]
      const previousTermRef = termRefs[ currentIdx - 1 ]
      if (!currentTermRef || !previousTermRef) {
        return
      }
      currentTermRef.blur()
      previousTermRef.focus()
    }
    function switchToNextTerm (currentIdx) {
      const currentTermRef = termRefs[ currentIdx ]
      const nextTermRef = termRefs[ currentIdx + 1 ]
      if (!currentTermRef || !nextTermRef) {
        return
      }
      currentTermRef.blur()
      nextTermRef.focus()
    }

    function handleTermSwitch (e, currentTermRef) {
      const inputRef = currentTermRef?.inputRef?.value
      if (!e.keyCode || !currentTermRef || !inputRef) {
        return
      }
      const currentTermIdx = termRefs.findIndex((r) => r === currentTermRef)
      switch (e.keyCode) {
        case 37: // ArrowLeft
        {
          // Check whether we should go to the left.
          if (inputRef.selectionStart === 0) {
            switchToPreviousTerm(currentTermIdx)
          }
          break
        }
        case 39: // ArrowRight
        {
          // Check whether we should go to the next term.
          if (inputRef.selectionStart === inputRef.value.length) {
            switchToNextTerm(currentTermIdx)
          }
          break
        }
        default:
          break
      }
    }

    function renderFilterType (type, groupIndex) {
      function handleFilter (val, update) {
        if (val === '') {
          update(() => {
            // filteredOptions.value = options
          })
          return
        }

        update(() => {
          const needle = val.toLowerCase()
          // filteredOptions.value = options.filter((v) => v.toLowerCase().indexOf(needle) > -1)
        })
      }

      const termIdx = groupIndex * 3
      return h(QTokenizedFilterTerm, {
        ...props,
        modelValue: type,
        ref: (el) => { termRefs[ termIdx ] = el },
        tabindex: props.tabindex,
        chipSize: 'md',
        options: typeOptions.value,
        optionsDark: isOptionsDark.value,
        multiple: false,
        disallowEmpty: true,
        editable: !props.disable && !props.readonly,
        onKeydown (e) {
          const termRef = termRefs[ termIdx ]
          handleTermSwitch(e, termRef)
        },
        'onUpdate:modelValue': (value) => {
          const newModelValue = props.modelValue.slice()
          if (!newModelValue[ groupIndex ]) {
            newModelValue[ groupIndex ] = []
          }
          if (newModelValue[ groupIndex ][ 0 ] !== value.id) {
            // Remove all other selections as we cannot guarantee there are the same operators and options.
            newModelValue[ groupIndex ] = [ value.id ]
            emit('update:modelValue', newModelValue)
          }
          nextTick(() => switchToNextTerm(termIdx))
        },
        onFilter: handleFilter,
        onPopupShow,
        onPopupHide
      }, {
        option: (scope) => {
          return h(
            QItem,
            {
              ...scope.itemProps
            },
            () => [
              h(
                QItemSection,
                {
                  avatar: true
                },
                () => [
                  h(QIcon, {
                    name: scope.opt.icon
                  })
                ]
              ),
              h(
                QItemSection,
                () => [
                  h(
                    QItemLabel,
                    () => scope.opt.label
                  )
                ]
              )
            ])
        },
        'selected-item': (scope) => {
          const filterType = typeOptions.value.find((filter) => filter.id === scope.opt)
          if (!filterType) {
            return null
          }
          const children = []
          if (filterType.icon) {
            children.push(h(
              QIcon,
              {
                name: filterType.icon,
                class: 'q-mr-xs'
              }
            ))
          }
          children.push(filterType.label)
          return h(
            'div',
            { class: 'row no-wrap items-center' },
            children
          )
        }
      })
    }

    function renderOperator (operator, selectedFilterType, groupIndex) {
      const operators = operatorsForTypes.value[ selectedFilterType ]
      if (!operators) {
        return null
      }
      const termIdx = groupIndex * 3 + 1
      return h(QTokenizedFilterTerm, {
        ...props,
        modelValue: operator,
        ref: (el) => { termRefs[ termIdx ] = el },
        tabindex: props.tabindex,
        chipSize: 'md',
        options: operators,
        optionsDark: isOptionsDark.value,
        multiple: false,
        disallowEmpty: true,
        editable: !props.disable && !props.readonly,
        onKeydown (e) {
          const termRef = termRefs[ termIdx ]
          handleTermSwitch(e, termRef)
        },
        'onUpdate:modelValue': (value) => {
          const newModelValue = props.modelValue.slice()
          if (newModelValue[ groupIndex ][ 1 ] !== value.id) {
            // Remove all other selections as we cannot guarantee there are the same operators and options.
            newModelValue[ groupIndex ][ 1 ] = value.id
            newModelValue[ groupIndex ].length = 2
            emit('update:modelValue', newModelValue)
          }
          nextTick(() => switchToNextTerm(termIdx))
        },
        // onFilter: handleFilter,
        onPopupShow,
        onPopupHide
      })
    }

    function renderSelectedOptions (options, selectedFilterType, selectedOperator, groupIndex) {
      const canSelectMultiple = props.validFilters[ selectedFilterType ]?.operators[ selectedOperator ]?.selectMultiple

      const optionsOrFn = props.validFilters[ selectedFilterType ]?.options
      const selectableOptions = typeof optionsOrFn === 'function' ? optionsOrFn(selectedOperator) : optionsOrFn

      const termIdx = groupIndex * 3 + 2
      return h(
        QTokenizedFilterTerm,
        {
          ...props,
          modelValue: options,
          ref: (el) => { termRefs[ termIdx ] = el },
          tabindex: props.tabindex,
          chipSize: 'md',
          options: selectableOptions,
          optionsDark: isOptionsDark.value,
          multiple: canSelectMultiple,
          disallowEmpty: true,
          editable: !props.disable && !props.readonly,
          onKeydown (e) {
            const termRef = termRefs[ termIdx ]
            handleTermSwitch(e, termRef)
          },
          'onUpdate:modelValue': (value) => {
            const newModelValue = props.modelValue.slice()
            newModelValue[ groupIndex ][ 2 ] = value
            emit('update:modelValue', newModelValue)
            if (!canSelectMultiple) {
              nextTick(() => switchToNextTerm(termIdx))
            }
          },
          // onFilter: handleFilter,
          onPopupShow,
          onPopupHide
        }
      )
    }

    function renderFilterGroup (group, groupIndex) {
      const children = []

      const selectedType = group[ 0 ]
      children.push(renderFilterType(selectedType, groupIndex))
      const selectedOperator = group[ 1 ]
      if (selectedType) {
        children.push(renderOperator(selectedOperator, selectedType, groupIndex))
      }
      const options = group[ 2 ]
      if (selectedType && selectedOperator) {
        children.push(renderSelectedOptions(options, selectedType, selectedOperator, groupIndex))
      }

      return h(
        'div',
        {
          class: 'q-tokenized-filter-term-group row items-center'
        },
        children
      )
    }

    Object.assign(state, {
      fieldClass: computed(() =>
        'q-tokenized-filter q-field--auto-height'
      ),
      getControl: () => {
        const children = props.modelValue ? props.modelValue.map(renderFilterGroup) : []

        if (lastGroupIsFinished.value) {
          // Show an empty filter when the last group is not finished.
          children.push(renderFilterGroup([], props.modelValue?.length ?? 0))
        }

        return [
          h(
            'div', {
              class: 'q-field__native row'
            },
            children
          )
        ]
      }
    })

    return useField(state)
  }
})
