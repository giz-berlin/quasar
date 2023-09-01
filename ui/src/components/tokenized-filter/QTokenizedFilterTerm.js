import { h, ref, computed, watch, onUpdated, onBeforeUnmount, nextTick, getCurrentInstance, onDeactivated, onActivated, onMounted, watchEffect } from 'vue'

import QChip from '../chip/QChip.js'

import QItem from '../item/QItem.js'
import QItemSection from '../item/QItemSection.js'
import QItemLabel from '../item/QItemLabel.js'

import QMenu from '../menu/QMenu.js'

import { useVirtualScroll, useVirtualScrollProps } from '../virtual-scroll/use-virtual-scroll.js'
import useKeyComposition from '../../composables/private/use-key-composition.js'
import { useFieldProps } from '../../composables/private/use-field.js'

import { createComponent } from '../../utils/private/create.js'
import { isDeepEqual } from '../../utils/is.js'
import { stop, prevent, stopAndPrevent } from '../../utils/event.js'
import { normalizeToInterval } from '../../utils/format.js'
import { shouldIgnoreKey, isKeyCode } from '../../utils/private/key-composition.js'
import { hMergeSlot } from '../../utils/private/render.js'
import { addFocusFn } from '../../utils/private/focus-manager.js'
import { uid } from '../../utils.js'
import useSplitAttrs from '../../composables/private/use-split-attrs.js'

const JOINER = ','

export default createComponent({
  name: 'QTokenizedFilterTerm',

  inheritAttrs: false,

  props: {
    ...useFieldProps,
    ...useVirtualScrollProps,

    modelValue: {
      required: true
    },

    multiple: Boolean,

    class: [ String, Array, Object ],

    displayValue: [ String, Number ],
    displayValueHtml: Boolean,

    options: {
      type: Array,
      default: () => []
    },

    optionValue: [ Function, String ],
    optionLabel: [ Function, String ],
    optionDisable: [ Function, String ],

    disallowEmpty: Boolean,
    maxValues: [ Number, String ],

    editable: {
      type: Boolean,
      default: () => true
    },

    optionsDense: Boolean,
    optionsDark: {
      type: Boolean,
      default: null
    },
    optionsSelectedClass: String,
    optionsHtml: Boolean,

    optionsCover: Boolean,

    menuAnchor: String,
    menuSelf: String,
    menuOffset: Array,

    popupContentClass: String,
    popupContentStyle: [ String, Array, Object ],

    mapOptions: Boolean,
    emitValue: Boolean,

    inputDebounce: {
      type: [ Number, String ],
      default: 250
    },

    inputClass: [ Array, String, Object ],
    inputStyle: [ Array, String, Object ],

    chipSize: {
      type: String,
      default: () => 'sm'
    },

    tabindex: {
      type: [ String, Number ],
      default: 0
    },

    autocomplete: String,

    transitionShow: String,
    transitionHide: String,
    transitionDuration: [ String, Number ],

    virtualScrollItemSize: {
      type: [ Number, String ],
      default: void 0
    },

    onNewValue: Function,
    onFilter: Function
  },

  emits: [
    'add', 'remove', 'inputValue', 'newValue',
    'keyup', 'keypress', 'keydown',
    'filterAbort', 'update:modelValue',
    'popupShow', 'popupHide',
    'focus', 'blur'
  ],

  setup (props, { slots, emit }) {
    const { proxy, attrs, vnode } = getCurrentInstance()
    const { $q } = proxy

    const inputUid = ref(`f_${ uid() }`)
    const selectionUid = ref(`f_${ uid() }`)
    const selectionRef = ref(null)
    const inputRef = ref(null)
    const menuRef = ref(null)
    const menu = ref(false)
    const didCloseWithEnter = ref(false)
    const hasPopupOpen = ref(false)
    const inputValue = ref('')
    const optionIndex = ref(-1)
    const innerLoadingIndicator = ref(false)
    const innerLoading = ref(false)
    const entryHoles = ref([])

    watch(menu, updateMenu)

    const shouldBeDisabled = computed(() => {
      return props.readonly === true || props.disable === true
    })
    // Close menu when disabling the component.
    watchEffect(() => {
      shouldBeDisabled.value === true && menu.value && closeMenu()
    })

    // Lifecycle hooks.
    onUpdated(updateMenuPosition)
    onBeforeUnmount(() => {
      inputTimer !== null && clearTimeout(inputTimer)
    })
    let shouldActivate = false
    onDeactivated(() => {
      shouldActivate = true
    })

    onActivated(() => {
      shouldActivate === true && props.autofocus === true && proxy.focus()
    })

    onMounted(() => {
      props.autofocus === true && proxy.focus()
      document.addEventListener('selectionchange', inputSelectionChangeHandler)
    })

    onBeforeUnmount(() => {
      focusoutTimer !== null && clearTimeout(focusoutTimer)
      document.removeEventListener('selectionchange', inputSelectionChangeHandler)
    })

    // General variables.

    let inputTimer = null, innerValueCache,
      userInputValue, filterId = null, defaultInputValue,
      searchBuffer, searchBufferExp, focusoutTimer = null

    function getPropValueFn (propValue, defaultVal) {
      const val = propValue !== void 0
        ? propValue
        : defaultVal
      return typeof val === 'function'
        ? val
        : opt => (opt !== null && typeof opt === 'object' && val in opt ? opt[ val ] : opt)
    }

    // Options

    // returns method to get value of an option;
    // takes into account 'option-value' prop
    const getOptionValue = computed(() => getPropValueFn(props.optionValue, 'value'))

    // returns method to get label of an option;
    // takes into account 'option-label' prop
    const getOptionLabel = computed(() => getPropValueFn(props.optionLabel, 'label'))

    // returns method to tell if an option is disabled;
    // takes into account 'option-disable' prop
    const isOptionDisabled = computed(() => getPropValueFn(props.optionDisable, 'disable'))

    const innerOptionsValue = computed(() => innerValue.value.map(opt => getOptionValue.value(opt)))

    const needsHtmlFn = computed(() => (
      props.optionsHtml === true
        ? () => true
        : opt => opt !== void 0 && opt !== null && opt.html === true
    ))

    function getOption (value, valueCache) {
      const fn = opt => isDeepEqual(getOptionValue.value(opt), value)
      return props.options.find(fn) || valueCache.find(fn) || value
    }

    function isOptionSelected (opt) {
      const val = getOptionValue.value(opt)
      return innerOptionsValue.value.find(v => isDeepEqual(v, val)) !== void 0
    }

    const innerValue = computed(() => {
      const
        val = props.modelValue !== void 0 && (props.modelValue !== null)
          ? (props.multiple === true && Array.isArray(props.modelValue) ? props.modelValue : [ props.modelValue ])
          : []

      if (props.mapOptions === true && Array.isArray(props.options) === true) {
        const cache = props.mapOptions === true && innerValueCache !== void 0
          ? innerValueCache
          : []
        return val.map(v => getOption(v, cache))
      }

      return val
    })

    const selectedScope = computed(() => {
      return innerValue.value.map((opt, i) => ({
        index: i,
        opt,
        html: false, // TODO
        selected: true,
        removeAtIndex: removeAtIndexAndFocus, // TODO
        toggleOption,
        tabindex: 0 // TODO
      }))
    })

    const isEmpty = computed(() => selectedScope.value.length < 1)
    const shouldShowInput = computed(() => menu.value || (props.disallowEmpty && isEmpty.value))

    const virtualScrollLength = computed(() => (
      Array.isArray(props.options)
        ? props.options.length
        : 0
    ))

    const virtualScrollItemSizeComputed = computed(() => (
      props.virtualScrollItemSize === void 0
        ? (props.optionsDense === true ? 24 : 48)
        : props.virtualScrollItemSize
    ))

    function getVirtualScrollEl () {
      return menuRef.value !== null && menuRef.value.contentEl !== null
        ? menuRef.value.contentEl
        : void 0
    }

    function getVirtualScrollTarget () {
      return getVirtualScrollEl()
    }

    const {
      virtualScrollSliceRange,
      virtualScrollSliceSizeComputed,
      localResetVirtualScroll,
      padVirtualScroll,
      onVirtualScrollEvt,
      scrollTo,
      setVirtualScrollSize
    } = useVirtualScroll({
      virtualScrollLength, getVirtualScrollTarget, getVirtualScrollEl,
      virtualScrollItemSizeComputed
    })
    const noOptions = computed(() => virtualScrollLength.value === 0)

    // Selection

    function selectionFocusHandler () {
      const el = document.activeElement
      const target = selectionRef.value && selectionRef.value.$el

      if (target && (el === null || el.id !== selectionUid.value)) {
        target.focus()
      }
    }

    function focusSelection () {
      nextTick(() => addFocusFn(selectionFocusHandler))
    }

    function getSelection () {
      // if (slots[ 'selected-item' ] !== void 0) {
      //   return selectedScope.value.map(scope => slots[ 'selected-item' ](scope)).slice()
      // }

      // if (slots.selected !== void 0) {
      //   return [].concat(slots.selected())
      // }

      return h(
        QChip,
        {
          ref: selectionRef,
          dark: props.dark,
          size: props.chipSize,
          removable: false,
          clickable: true,
          disable: shouldBeDisabled.value,
          dense: props.dense,
          square: true,
          textColor: props.color,
          id: selectionUid.value,
          onClick (e) {
            stopAndPrevent(e)
            // When having selected an option with the enter key and thus closing the menu,
            // the keyup of enter would trigger showing the menu again which is not desired.
            if (didCloseWithEnter.value === true) {
              didCloseWithEnter.value = false
              return false
            }
            showMenu()
          }
        },
        slots[ 'selected-item' ] !== void 0
          ? () => selectedScope.value.map(scope => slots[ 'selected-item' ](scope)).slice()
          : () => selectedScope.value.map((scope, idx, arr) => h('span', {
              class: `ellipsis ${ idx < arr.length - 1 ? 'q-mr-xs' : '' }`,
              // [ scope.html === true ? 'innerHTML' : 'textContent' ]: getOptionLabel.value(scope.opt)
              textContent: getOptionLabel.value(scope.opt) + (idx < arr.length - 1 ? JOINER : '')
            }))
      )
    }

    function removeRange (start, end) {
      if (end < start) {
        return
      }
      if ((start > -1 || end > -1)) {
        if (props.multiple === true) {
          const model = props.modelValue.slice()
          for (const hole of entryHoles.value) {
            model.splice(hole, 0, undefined)
          }
          for (let idx = end; idx >= start; idx -= 1) {
            emit('remove', { idx, value: model[ idx ] })
          }
          model.splice(start, end - start + 1)
          if (start > 0 && end < model.length && !entryHoles.value.includes(start)) {
            entryHoles.value.push(start)
          }
          emit('update:modelValue', model.filter((value) => value))
        }
        else {
          emit('update:modelValue', null)
        }
      }
    }

    function removeAtIndex (index) {
      removeRange(index, index)
    }

    function removeAtIndexAndFocus (index) {
      removeAtIndex(index)
      focusInput()
    }

    function toggleOption (opt, enterPressed) {
      if (props.editable !== true || opt === void 0 || isOptionDisabled.value(opt) === true) {
        return
      }

      const optValue = getOptionValue.value(opt)

      if (props.multiple !== true) {
        updateInputValue(
          getOptionLabel.value(opt),
          true,
          true
        )

        if (enterPressed === true) {
          didCloseWithEnter.value = true
        }

        closeMenu(true)

        if (
          innerValue.value.length === 0
          || isDeepEqual(getOptionValue.value(innerValue.value[ 0 ]), optValue) !== true
        ) {
          emit('update:modelValue', props.emitValue === true ? optValue : opt)
        }
        return
      }

      if (innerValue.value.length === 0) {
        const val = props.emitValue === true ? optValue : opt
        emit('add', { index: 0, value: val })
        emit('update:modelValue', props.multiple === true ? [ val ] : val)
        nextTick(() => {
          focusInput()
          resetInputValue()
        })
        return
      }

      const
        model = props.modelValue.slice(),
        index = innerOptionsValue.value.findIndex(v => isDeepEqual(v, optValue))

      if (index > -1) {
        emit('remove', { index, value: model.splice(index, 1)[ 0 ] })
      }
      else {
        if (props.maxValues !== void 0 && model.length >= props.maxValues) {
          return
        }

        const val = props.emitValue === true ? optValue : opt

        const [ startSelectionSegment ] = selectionSegmentsInInput()
        emit('add', { index: startSelectionSegment, value: val })
        const isSparse = !model[ startSelectionSegment ]
        // Insert at the correct index (starting from selection).
        model.splice(startSelectionSegment, isSparse ? 1 : 0, val)
      }

      emit('update:modelValue', model)

      nextTick(() => {
        focusInput()
        resetInputValue()
      })
    }

    // Input
    function selectionSegmentsInInput () {
      if (props.multiple !== true) {
        return [ 0, 0 ]
      }
      const selectionStart = inputRef.value?.selectionStart ?? inputValue.value.length
      const selectionEnd = inputRef.value?.selectionEnd ?? inputValue.value.length
      const joinerIndices = []
      for (let i = 0; i < inputValue.value.length; i++) {
        if (inputValue.value[ i ] === JOINER) joinerIndices.push(i)
      }
      const startSegment = Math.max(0, joinerIndices.findLastIndex((val) => val < selectionStart) + 1)
      const endSegment = Math.max(0, joinerIndices.findLastIndex((val) => val < selectionEnd) + 1)
      return [ startSegment, endSegment ]
    }

    function inputFocusHandler () {
      const el = document.activeElement
      let target = inputRef.value !== void 0 && inputRef.value

      if (target && (el === null || el.id !== inputUid.value)) {
        target.hasAttribute('tabindex') === true || (target = target.querySelector('[tabindex]'))
        if (target && target !== el) {
          target.focus({ preventScroll: true })
          menu.value = true
        }
      }
    }

    function focusInput () {
      menu.value = true
      nextTick(() => addFocusFn(inputFocusHandler))
    }

    function setInputValue (val) {
      if (inputValue.value !== val) {
        inputValue.value = val
        emit('inputValue', val)
      }
    }

    function getSegmentValueFromInput (fullValue) {
      if (props.multiple !== true) {
        return fullValue
      }
      const segments = fullValue.split(JOINER)
      const [ startSegment ] = selectionSegmentsInInput()
      const currentSegmentText = segments[ startSegment ] || ''
      return currentSegmentText
    }

    function updateInputValue (val, noFiltering, internal) {
      userInputValue = internal !== true

      setInputValue(val)

      if (noFiltering === true || internal !== true) {
        defaultInputValue = val
      }

      noFiltering !== true && filter(getSegmentValueFromInput(val))
    }

    function resetInputValue () {
      updateInputValue(
        innerValue.value.length !== 0
          ? (props.multiple !== true ? getOptionLabel.value(innerValue.value[ 0 ]) || '' : joinOptions(innerValue.value))
          : '',
        true,
        true
      )
    }

    function filter (val, keepClosed, afterUpdateFn) {
      if (props.onFilter === void 0 || (keepClosed !== true && menu.value !== true)) {
        return
      }

      if (innerLoading.value === true) {
        emit('filterAbort')
      }
      else {
        innerLoading.value = true
        innerLoadingIndicator.value = true
      }

      if (
        val !== ''
        && props.multiple !== true
        && innerValue.value.length !== 0
        && userInputValue !== true
        && val === getOptionLabel.value(innerValue.value[ 0 ])
      ) {
        val = ''
      }

      const localFilterId = setTimeout(() => {
        menu.value === true && (menu.value = false)
      }, 10)

      filterId !== null && clearTimeout(filterId)
      filterId = localFilterId

      emit(
        'filter',
        val,
        (fn, afterFn) => {
          if ((keepClosed === true || menu.value === true) && filterId === localFilterId) {
            clearTimeout(filterId)

            typeof fn === 'function' && fn()

            // hide indicator to allow arrow to animate
            innerLoadingIndicator.value = false

            nextTick(() => {
              innerLoading.value = false

              if (props.editable === true) {
                if (keepClosed === true) {
                  menu.value === true && closeMenu(true)
                }
                else if (menu.value === true) {
                  updateMenu(true)
                }
                else {
                  menu.value = true
                }
              }

              typeof afterFn === 'function' && nextTick(() => { afterFn(proxy) })
              typeof afterUpdateFn === 'function' && nextTick(() => { afterUpdateFn(proxy) })
            })
          }
        },
        () => {
          if (menu.value === true && filterId === localFilterId) {
            clearTimeout(filterId)
            innerLoading.value = false
            innerLoadingIndicator.value = false
          }
          menu.value === true && (menu.value = false)
        }
      )
    }

    function onInput (e) {
      if (inputTimer !== null) {
        clearTimeout(inputTimer)
        inputTimer = null
      }

      if (e && e.target && e.target.qComposing === true) {
        return
      }

      setInputValue(e.target.value || '')
      // mark it here as user input so that if updateInputValue is called
      // before filter is called the indicator is reset
      userInputValue = true
      defaultInputValue = inputValue.value

      if (
        menu.value !== true
      ) {
        focusInput()
      }

      if (props.onFilter !== void 0) {
        inputTimer = setTimeout(() => {
          inputTimer = null
          filter(getSegmentValueFromInput(inputValue.value))
        }, props.inputDebounce)
      }
    }

    const comboboxAttrs = computed(() => {
      const attrs = {
        tabindex: props.tabindex,
        role: 'combobox',
        'aria-label': props.label,
        'aria-readonly': props.readonly === true ? 'true' : 'false',
        'aria-autocomplete': 'list',
        'aria-expanded': menu.value === true ? 'true' : 'false',
        'aria-controls': `${ inputUid.value }_lb`
      }

      if (optionIndex.value >= 0) {
        attrs[ 'aria-activedescendant' ] = `${ inputUid.value }_${ optionIndex.value }`
      }

      return attrs
    })

    const computedInputClass = computed(() => {
      let cls = 'q-field__input q-placeholder col'

      if (!shouldShowInput.value) {
        cls += ' hidden'
      }

      if (props.hideSelected === true || innerValue.value.length === 0) {
        return [ cls, props.inputClass ]
      }

      cls += ' q-field__input--padding'

      return props.inputClass === void 0
        ? cls
        : [ cls, props.inputClass ]
    })

    function joinOptions (options) {
      return options.map((opt) => getOptionLabel.value(opt)).join(JOINER)
    }

    const selectedString = computed(() => joinOptions(innerValue.value))

    const onComposition = useKeyComposition(onInput)
    const splitAttrs = useSplitAttrs(attrs, vnode)

    function onInputKeyup (e) {
      // if ESC and we have an opened menu
      // then stop propagation (might be caught by a QDialog
      // and so it will also close the QDialog, which is wrong)
      if (isKeyCode(e, 27) === true && menu.value === true) {
        stop(e)
        // on ESC we need to close the dialog also
        closeMenu(true)
        resetInputValue()
      }
    }

    function onInputAutocomplete (e) {
      const { value } = e.target

      if (e.keyCode !== void 0) {
        onInputKeyup(e)
        return
      }

      e.target.value = ''

      if (inputTimer !== null) {
        clearTimeout(inputTimer)
        inputTimer = null
      }

      resetInputValue()

      if (typeof value === 'string' && value.length !== 0) {
        const needle = value.toLocaleLowerCase()
        const findFn = extractFn => {
          const option = props.options.find(opt => extractFn.value(opt).toLocaleLowerCase() === needle)

          if (option === void 0) {
            return false
          }

          if (innerValue.value.indexOf(option) === -1) {
            toggleOption(option)
          }
          else {
            closeMenu(true)
          }

          return true
        }
        const fillFn = afterFilter => {
          if (findFn(getOptionValue) === true) {
            return
          }
          if (findFn(getOptionLabel) === true || afterFilter === true) {
            return
          }

          filter(getSegmentValueFromInput(value), true, () => fillFn(true))
        }

        fillFn()
      }
      else {
        // TODO: clearValue(e)
      }
    }

    function onInputKeypress (e) {
      emit('keypress', e)
    }

    function onInputKeydown (e) {
      emit('keydown', e)

      if (shouldIgnoreKey(e) === true) {
        return
      }

      const tabShouldSelect = e.shiftKey !== true
        && props.multiple !== true
        && (optionIndex.value > -1)

      // escape
      if (e.keyCode === 27) {
        prevent(e) // prevent clearing the inputValue
        return
      }

      // tab
      if (e.keyCode === 9 && tabShouldSelect === false) {
        closeMenu(true)
        return
      }

      if (
        e.target === void 0
        || e.target.id !== inputUid.value
        || props.editable !== true
      ) { return }

      // down
      if (
        e.keyCode === 40
        && innerLoading.value !== true
        && menu.value === false
      ) {
        stopAndPrevent(e)
        showMenu()
        return
      }

      // backspace
      if (
        e.keyCode === 8
      ) {
        if (props.multiple === true && Array.isArray(props.modelValue) === true) {
          const [ startSegment, endSegment ] = selectionSegmentsInInput()
          removeRange(startSegment, endSegment, true)
        }
        else if (props.multiple !== true && props.modelValue !== null) {
          emit('update:modelValue', null)
        }
        return
      }

      // home, end - 36, 35
      if (
        (e.keyCode === 35 || e.keyCode === 36)
        && (typeof inputValue.value !== 'string' || inputValue.value.length === 0)
      ) {
        stopAndPrevent(e)
        optionIndex.value = -1
        moveOptionSelection(e.keyCode === 36 ? 1 : -1, props.multiple)
      }

      // pg up, pg down - 33, 34
      if (
        (e.keyCode === 33 || e.keyCode === 34)
        && virtualScrollSliceSizeComputed.value !== void 0
      ) {
        stopAndPrevent(e)
        optionIndex.value = Math.max(
          -1,
          Math.min(
            virtualScrollLength.value,
            optionIndex.value + (e.keyCode === 33 ? -1 : 1) * virtualScrollSliceSizeComputed.value.view
          )
        )
        moveOptionSelection(e.keyCode === 33 ? 1 : -1, props.multiple)
      }

      // up, down
      if (e.keyCode === 38 || e.keyCode === 40) {
        stopAndPrevent(e)
        moveOptionSelection(e.keyCode === 38 ? -1 : 1, props.multiple)
      }

      const optionsLength = virtualScrollLength.value

      // clear search buffer if expired
      if (searchBuffer === void 0 || searchBufferExp < Date.now()) {
        searchBuffer = ''
      }

      // enter or tab (when not using multiple and option selected)
      if (
        e.keyCode !== 13
        && (e.keyCode !== 9 || tabShouldSelect === false)
      ) { return }

      e.keyCode !== 9 && stopAndPrevent(e)

      if (optionIndex.value > -1 && optionIndex.value < optionsLength) {
        toggleOption(props.options[ optionIndex.value ], true)
      }
    }

    function selectInputText (e) {
      if (
        inputRef.value !== null
        && (e === void 0 || (inputRef.value === e.target && e.target.value === selectedString.value))
      ) {
        inputRef.value.select()
      }
    }

    function handleInputFocus (e) {
      selectInputText(e)
      if (menu.value === false) {
        showMenu(e)
      }
    }

    const previousSelection = ref(-1)
    function inputSelectionChangeHandler (e) {
      console.log(e)
      const el = document.activeElement
      const target = inputRef.value !== void 0 && inputRef.value
      const selection = window.getSelection()

      if (target && selection.type === 'Caret' && target && el.id === inputUid.value && previousSelection.value !== target.selectionStart) {
        previousSelection.value = target.selectionStart
        stopAndPrevent(e)
        // filter(getSegmentValueFromInput(inputValue.value))
      }
    }

    const inputControlEvents = computed(() => {
      const evt = {
        onInput,
        // Safari < 10.2 & UIWebView doesn't fire compositionend when
        // switching focus before confirming composition choice
        // this also fixes the issue where some browsers e.g. iOS Chrome
        // fires "change" instead of "input" on autocomplete.
        onChange: onComposition,
        onKeydown: onInputKeydown,
        onKeyup: onInputAutocomplete,
        onKeypress: onInputKeypress,
        onFocus: handleInputFocus
      }

      evt.onCompositionstart = evt.onCompositionupdate = evt.onCompositionend = onComposition

      return evt
    })

    function getInput () {
      const attrs = { ...comboboxAttrs.value, ...splitAttrs.attributes.value }

      const data = {
        ref: inputRef,
        key: 'i_t',
        class: computedInputClass.value,
        style: props.inputStyle,
        value: inputValue.value !== void 0 ? inputValue.value : '',
        // required for Android in order to show ENTER key when in form
        type: 'search',
        ...attrs,
        id: inputUid.value,
        maxlength: props.maxlength,
        autocomplete: props.autocomplete,
        'data-autofocus': props.autofocus === true || void 0,
        disabled: props.disable === true,
        readonly: props.readonly === true,
        ...inputControlEvents.value
      }

      return h('input', data)
    }

    // Menu
    const menuContentClass = computed(() =>
      (props.virtualScrollHorizontal === true ? 'q-virtual-scroll--horizontal' : '')
    + (props.popupContentClass ? ' ' + props.popupContentClass : '')
    )

    const listboxAttrs = computed(() => ({
      id: `${ inputUid.value }_lb`,
      role: 'listbox',
      'aria-multiselectable': props.multiple === true ? 'true' : 'false'
    }))

    function onControlFocusout (e, then) {
      focusoutTimer !== null && clearTimeout(focusoutTimer)
      focusoutTimer = setTimeout(() => {
        focusoutTimer = null

        if (menu.value === true) {
          menu.value = false
          emit('blur', e)
        }

        then !== void 0 && then()
      })
    }

    function onMenuBeforeShow () {
      entryHoles.value = []
      resetInputValue()
      emit('popupShow')
      hasPopupOpen.value = true
      if (focusoutTimer !== null) {
        clearTimeout(focusoutTimer)
        focusoutTimer = null
      }

      if (props.editable === true) {
        emit('focus')
      }
    }

    function onMenuBeforeHide () {
      emit('popupHide')
      hasPopupOpen.value = false
      onControlFocusout()
    }

    function onMenuShow () {
      setVirtualScrollSize()
    }

    function closeMenu (shouldKeepFocus = false) {
      optionIndex.value = -1

      if (menu.value === true) {
        menu.value = false
        setInputValue('')
        if (shouldKeepFocus) {
          focusSelection()
        }
      }

      if (menu.value === false) {
        if (filterId !== null) {
          clearTimeout(filterId)
          filterId = null
        }

        if (innerLoading.value === true) {
          emit('filterAbort')
          innerLoading.value = false
          innerLoadingIndicator.value = false
        }
      }
    }

    function showMenu (e) {
      if (props.editable !== true) {
        return
      }

      focusInput()

      if (props.onFilter !== void 0) {
        filter(getSegmentValueFromInput(inputValue.value))
      }
      else if (noOptions.value !== true || slots[ 'no-option' ] !== void 0) {
        menu.value = true
      }
    }

    const computedOptionsSelectedClass = computed(() => (
      props.optionsSelectedClass !== void 0
        ? props.optionsSelectedClass
        : (props.color !== void 0 ? `text-${ props.color }` : '')
    ))

    const optionScope = computed(() => {
      if (virtualScrollLength.value === 0) {
        return []
      }

      const { from, to } = virtualScrollSliceRange.value

      return props.options.slice(from, to).map((opt, i) => {
        const disable = isOptionDisabled.value(opt) === true
        const index = from + i

        const itemProps = {
          clickable: true,
          active: false,
          activeClass: computedOptionsSelectedClass.value,
          manualFocus: true,
          focused: false,
          disable,
          tabindex: -1,
          dense: props.optionsDense,
          dark: props.optionsDark,
          role: 'option',
          id: `${ inputUid.value }_${ index }`,
          onClick: () => { toggleOption(opt) }
        }

        if (disable !== true) {
          isOptionSelected(opt) === true && (itemProps.active = true)
          optionIndex.value === index && (itemProps.focused = true)

          itemProps[ 'aria-selected' ] = itemProps.active === true ? 'true' : 'false'

          if ($q.platform.is.desktop === true) {
            itemProps.onMousemove = () => { menu.value === true && setOptionIndex(index) }
          }
        }

        return {
          index,
          opt,
          html: needsHtmlFn.value(opt),
          label: getOptionLabel.value(opt),
          selected: itemProps.active,
          focused: itemProps.focused,
          toggleOption,
          setOptionIndex,
          itemProps
        }
      })
    })

    function updateMenuPosition () {
      if (menuRef.value !== null) {
        menuRef.value.updatePosition()
      }
    }

    function getAllMenuOptions () {
      if (noOptions.value === true) {
        return slots[ 'no-option' ] !== void 0
          ? slots[ 'no-option' ]({ inputValue: inputValue.value })
          : void 0
      }

      const fn = slots.option !== void 0
        ? slots.option
        : scope => {
          return h(QItem, {
            key: scope.index,
            ...scope.itemProps
          }, () => {
            return h(
              QItemSection,
              () => h(
                QItemLabel,
                () => h('span', {
                  [ scope.html === true ? 'innerHTML' : 'textContent' ]: scope.label
                })
              )
            )
          })
        }

      let options = padVirtualScroll('div', optionScope.value.map(fn))

      if (slots[ 'before-options' ] !== void 0) {
        options = slots[ 'before-options' ]().concat(options)
      }

      return hMergeSlot(slots[ 'after-options' ], options)
    }

    function getMenu () {
      if (
        props.editable !== false && (
          noOptions.value !== true
          || slots[ 'no-option' ] !== void 0
        )
      ) {
        return h(QMenu, {
          ref: menuRef,
          class: menuContentClass.value,
          style: props.popupContentStyle,
          modelValue: menu.value,
          fit: false,
          cover: false,
          anchor: props.menuAnchor,
          self: props.menuSelf,
          offset: props.menuOffset,
          dark: props.optionsDark,
          noParentEvent: true,
          noRefocus: true,
          noFocus: true,
          square: false, // TODO
          transitionShow: props.transitionShow,
          transitionHide: props.transitionHide,
          transitionDuration: props.transitionDuration,
          separateClosePopup: true,
          ...listboxAttrs.value,
          onScrollPassive: onVirtualScrollEvt,
          onBeforeShow: onMenuBeforeShow,
          onBeforeHide: onMenuBeforeHide,
          onShow: onMenuShow
        }, getAllMenuOptions)
      }
      else if (hasPopupOpen.value === true) {
        // explicitly set it otherwise TAB will not blur component
        hasPopupOpen.value = false
      }
    }

    function updateMenu (show) {
      let optionIndex = -1

      if (show === true) {
        if (innerValue.value.length !== 0) {
          const val = getOptionValue.value(innerValue.value[ 0 ])
          optionIndex = props.options.findIndex(v => isDeepEqual(getOptionValue.value(v), val))
        }

        localResetVirtualScroll(optionIndex)
      }

      setOptionIndex(optionIndex)
    }

    function setOptionIndex (index) {
      if ($q.platform.is.desktop !== true) { return }

      const val = index > -1 && index < virtualScrollLength.value
        ? index
        : -1

      if (optionIndex.value !== val) {
        optionIndex.value = val
      }
    }

    function moveOptionSelection (offset = 1, skipInputValue) {
      if (menu.value === true) {
        let index = optionIndex.value
        do {
          index = normalizeToInterval(
            index + offset,
            -1,
            virtualScrollLength.value - 1
          )
        }
        while (index !== -1 && index !== optionIndex.value && isOptionDisabled.value(props.options[ index ]) === true)

        if (optionIndex.value !== index) {
          setOptionIndex(index)
          scrollTo(index)

          if (skipInputValue !== true) {
            setInputValue(index >= 0
              ? getOptionLabel.value(props.options[ index ])
              : defaultInputValue
            )
          }
        }
      }
    }

    // Expose functions

    Object.assign(proxy, {
      blur: closeMenu,
      focus: showMenu,
      inputRef,
      menuRef
    })

    // Overall layout

    function getContent () {
      const children = []

      if (props.disallowEmpty && isEmpty.value) {
        // In this case always show the input field.
        children.push(getMenu())
        children.push(getInput())
        return children
      }

      menu.value === false && children.push(getSelection())

      children.push(getMenu())
      menu.value === true && children.push(getInput())

      return children
    }

    const computedFilterTermClass = computed(() => {
      const cls = [ 'q-tokenized-filter-term' ]
      return props.class === void 0
        ? cls
        : [ cls, props.class ]
    })

    return function renderFilterTerm () {
      return h('div',
        {
          class: computedFilterTermClass.value
        },
        getContent()
      )
    }
  }
})
