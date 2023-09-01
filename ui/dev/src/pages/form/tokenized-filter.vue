<template>
  <div>
    <div class="q-layout-padding q-gutter-y-md" :class="{ 'bg-grey-8 text-white': dark }">
      <div class="q-gutter-sm">
        <q-radio :dark="dark" v-model="type" val="filled" label="Filled" />
        <q-radio :dark="dark" v-model="type" val="outlined" label="Outlined" />
        <q-radio :dark="dark" v-model="type" val="standout" label="Standout" />
        <q-radio :dark="dark" v-model="type" val="standard" label="Standard" />
        <q-radio :dark="dark" v-model="type" val="borderless" label="Borderless" />
      </div>
      <div>
        <q-toggle :dark="dark" v-model="readonly" label="Readonly" />
        <q-toggle :dark="dark" v-model="disable" label="Disable" />
        <q-toggle :dark="dark" v-model="dense" label="Dense" />
        <q-toggle :dark="dark" v-model="optionsDense" label="(Options) Dense" />
        <q-toggle :dark="dark" v-model="optionsCover" label="Options cover" />
        <q-toggle :dark="dark" v-model="dark" label="Dark" :false-value="null" />
        <q-toggle :dark="dark" v-model="optionsDark" label="(Options) Dark" />
      </div>

      <div class="text-h6">
        String options
      </div>

      <div>{{ stringMultiple }}</div>
      <q-tokenized-filter
        v-bind="props"
        v-model="stringMultiple"
        label="Multiple"
        multiple
      />

      <!-- <div class="text-h6">
        Filter term
      </div>
      <q-tokenized-filter-term
        v-bind="props"
        v-model="heavyModel"
        :options="heavyListFiltered"
        @filter="simpleFilterInputFn"
        multiple
        fill-input
      />

      <q-tokenized-filter-term
        v-bind="props"
        v-model="stringSingle"
        :options="stringOptions"
        fill-input
      />

      <div class="text-h6">
        String options
      </div>

      <div>{{ stringMultiple }}</div>
      <q-tokenized-filter
        v-bind="props"
        v-model="stringMultiple"
        :filter-options="stringOptions"
        label="Multiple"
        multiple
      />

      <div class="text-h6">
        Object options
      </div>

      <div>{{ objectMultiple }}</div>
      <q-tokenized-filter
        v-bind="props"
        v-model="objectMultiple"
        :filter-options="objectOptions"
        label="Multiple"
        multiple
      /> -->

      <!-- <div class="text-h6">
        Null model
        <q-btn outline color="negative" label="Reset" @click="resetNull" />
      </div>

      <div>{{ stringEmitNullMultiple }}</div>
      <q-tokenized-filter
        v-bind="props"
        v-model="stringEmitNullMultiple"
        :filter-options="objectNullOptions"
        emit-value
        map-options
        label="Multiple - emit - map - object"
        multiple
      />

      <div>{{ stringNullMultiple }}</div>
      <q-tokenized-filter
        v-bind="props"
        v-model="stringNullMultiple"
        :filter-options="stringOptions"
        label="Multiple - string"
        multiple
      />

      <div>{{ objectNullMultiple }}</div>
      <q-tokenized-filter
        v-bind="props"
        v-model="objectNullMultiple"
        :filter-options="objectOptions"
        label="Multiple - object"
        multiple
      />

      <div class="text-h6">
        Emit value
      </div>

      <div>{{ stringEmitMultiple }}</div>
      <q-tokenized-filter
        emit-value
        v-bind="props"
        v-model="stringEmitMultiple"
        :filter-options="stringOptions"
        label="Multiple - string"
        multiple
      />

      <div>{{ objectEmitMultiple }}</div>
      <q-tokenized-filter
        emit-value
        v-bind="props"
        v-model="objectEmitMultiple"
        :filter-options="objectOptions"
        label="Multiple - object"
        multiple
      />

      <div class="text-h6">
        Scoped Slot: option (with menu on icon)
      </div>

      <q-tokenized-filter
        v-bind="props"
        v-model="objectMultiple"
        label="Multiple"
        :filter-options="objectOptions"
        multiple
      >
        <template v-slot:option="scope">
          <q-item v-bind="scope.itemProps">
            <q-item-section avatar>
              <q-icon tabindex="0" :name="scope.opt.icon" />
            </q-item-section>
            <q-item-section>
              <q-item-label v-if="scope.html">
                <div v-html="scope.opt.label" />
              </q-item-label>
              <q-item-label v-else >
                {{ scope.opt.label }}
              </q-item-label>
              <q-item-label caption>
                {{ scope.opt.description }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </q-tokenized-filter>

      <div class="text-h6">
        Scoped slot: selected
      </div>
      <q-tokenized-filter
        v-bind="props"
        v-model="objectMultiple"
        :filter-options="objectOptions"
        label="Label"
        multiple
      >
        <template v-slot:selected-item="scope">
          <q-chip
            removable
            :dense="dense"
            @remove="scope.removeAtIndex(scope.index)"
            :tabindex="scope.tabindex"
            color="white"
            text-color="primary"
          >
            <q-avatar color="primary" text-color="white" :icon="scope.opt.icon" />
            <span v-if="scope.html" v-html="scope.opt.label" />
            <span v-else>
              {{ scope.opt.label }}
            </span>
          </q-chip>
        </template>
      </q-tokenized-filter>

      <div class="text-h6">
        Max values (in this case 2)
      </div>
      <q-tokenized-filter
        v-bind="props"
        v-model="objectMultiple"
        :filter-options="objectOptions"
        multiple
        counter
        max-values="2"
        color="teal"
      />

      <div class="text-h6">
        Heavy test (100k options)
      </div>
      <q-tokenized-filter
        v-bind="props"
        v-model="heavyModel"
        :filter-options="heavyList"
        label="Heavy"
        multiple
        use-chips
      />

      <q-tokenized-filter
        v-bind="props"
        v-model="heavyModel"
        :filter-options="heavyList"
        label="Heavy"
        multiple
        color="teal"
      >
        <template v-slot:selected-item="scope">
          <q-chip
            removable
            @remove="scope.removeAtIndex(scope.index)"
            :tabindex="scope.tabindex"
            color="white"
            text-color="teal"
          >
            <span v-if="scope.html" v-html="scope.opt.label" />
            <span v-else>
              {{ scope.opt.label }}
            </span>
          </q-chip>
        </template>
      </q-tokenized-filter>

      <div class="text-h6">
        No options
      </div>
      <q-tokenized-filter
        v-bind="props"
        v-model="stringMultiple"
        label="String - multiple"
        multiple
      />
      <q-tokenized-filter
        v-bind="props"
        v-model="objectMultiple"
        label="Object - multiple"
        multiple
      />

      <div class="text-h6">
        No options, slot: no-options
      </div>
      <q-tokenized-filter
        v-bind="props"
        v-model="stringMultiple"
        use-input
        label="String - multiple"
      >
        <template v-slot:no-option="scope">
          <q-item>
            <q-item-section>
              No options slot. Input value: {{ scope.inputValue }}
            </q-item-section>
          </q-item>
        </template>
      </q-tokenized-filter>

      <div class="text-h6">
        Alignment test: standard, use-input, use-input + hide-selected, normal input
      </div>
      <div class="row q-gutter-sm">
        <q-tokenized-filter
          class="col-2"
          v-bind="props"
          v-model="stringSingle"
          :filter-options="stringOptions"
          label="Multiple - standard"
        />

        <q-tokenized-filter
          class="col-2"
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          label="Multiple - use input"
          use-input
        />

        <q-tokenized-filter
          class="col-2"
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          label="Multiple - hide-selected"
          use-input
          hide-selected
        />

        <q-input
          class="col-2"
          v-bind="props"
          :model-value="stringMultiple"
          @update:model-value="val => stringMultiple = val === null ? '' : val"
          label="Input"
        />
      </div>

      <div class="row q-gutter-sm">
        <q-tokenized-filter
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          label="Multiple - standard"
          prefix="A"
        />

        <q-input
          v-bind="props"
          :model-value="stringMultiple"
          @update:model-value="val => stringMultiple = val === null ? '' : val"
          label="Input"
          prefix="A"
        />

        <q-tokenized-filter
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          label="Multiple - use input"
          use-input
        />

        <q-tokenized-filter
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          label="Multiple - hide-selected"
          use-input
          hide-selected
        />

        <q-tokenized-filter
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          label="Multiple - use-chips use-input"
          use-chips
          use-input
        />

        <q-tokenized-filter
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          label="Multiple - use-chips"
          use-chips
        />
      </div>

      <div class="row q-gutter-sm">
        <q-tokenized-filter
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          prefix="A"
        />

        <q-input
          v-bind="props"
          :model-value="stringMultiple"
          @update:model-value="val => stringMultiple = val === null ? '' : val"
          prefix="A"
        />

        <q-tokenized-filter
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          use-input
        />

        <q-tokenized-filter
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          use-input
          hide-selected
        />

        <q-tokenized-filter
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          use-chips
          use-input
        />

        <q-tokenized-filter
          v-bind="props"
          v-model="stringMultiple"
          :filter-options="stringOptions"
          use-chips
        />
      </div> -->
    </div>
  </div>
</template>

<script>
const heavyList = []
for (let i = 0; i <= 100000; i++) {
  heavyList.push({
    label: 'Opt ' + i,
    value: Math.random()
  })
}

Object.freeze(heavyList)

export default {
  data () {
    return {
      validFilters: {
        author: {
          label: 'Author',
          icon: 'person',
          operators: {
            is: {
              label: 'is',
              selectMultiple: false
            },
            oneOf: {
              label: 'is one of',
              selectMultiple: true
            }
          },
          options: [ 'aaa', 'bbbb', 'ccccc' ] // this can also be a function returning options as an array
        },
        assignee: {
          label: 'Assignee',
          icon: 'person',
          operators: {
            isNot: {
              label: 'is not',
              selectMultiple: false
            },
            notOneOf: {
              label: 'is not one of',
              selectMultiple: true
            }
          },
          options: () => [ 'a', 'b', 'c' ] // this can also be a function returning options as an array (or as a promise)
        }
      },

      dispValSelection: [],
      dispValOptions: [
        'Option 1',
        'Option 2',
        'Option 3'
      ],

      type: 'filled',
      readonly: false,
      disable: false,
      dense: false,
      dark: null,
      optionsDark: false,
      optionsDense: false,
      optionsCover: false,

      stringMultiple: [ [ 'author', 'is' ] ]
    }
  },

  methods: {
    resetNull () {

    },

    simpleFilterInputFn (val, update) {
      if (val === '') {
        update(() => {
          this.stringOptionsFiltered = this.stringOptions
          this.heavyListFiltered = this.heavyList
        })
        return
      }

      update(() => {
        const needle = val.toLowerCase()
        this.stringOptionsFiltered = this.stringOptions.filter(v => v.toLowerCase().indexOf(needle) > -1)
        this.heavyListFiltered = this.heavyList.filter((v) => v.label.toLowerCase().indexOf(needle) > -1)
      })
    }
  },

  computed: {
    props () {
      return {
        [ this.type ]: true,
        readonly: this.readonly,
        disable: this.disable,
        dense: this.dense,
        dark: this.dark,
        optionsDense: this.optionsDense,
        optionsDark: this.optionsDark,
        optionsCover: this.optionsCover,
        clearable: true,
        validFilters: this.validFilters
      }
    }
  }
}
</script>

<style lang="sass">
.select-card
  transition: .3s background-color
  &:not(.disabled):hover
    background: $grey-3
</style>
