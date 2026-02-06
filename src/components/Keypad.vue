<script setup>
import { ref } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '0' },
  title: { type: String, default: '' },
  unit: { type: String, default: 'Hz' }
});

const emit = defineEmits(['update:modelValue', 'submit', 'close']);

const input = ref('0');

const units = [
  { label: 'G', factor: 1e9 },
  { label: 'M', factor: 1e6 },
  { label: 'k', factor: 1e3 },
  { label: 'x1', factor: 1 }
];

const append = (val) => {
  if (input.value === '0' && val !== '.') {
    input.value = val;
  } else {
    input.value += val;
  }
};

const backspace = () => {
  input.value = input.value.slice(0, -1) || '0';
};

const submitWithUnit = (factor) => {
  const num = parseFloat(input.value) * factor;
  emit('submit', num);
};
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog keypad-dialog">
      <div class="dialog-title">Input {{ title }}</div>
      <div class="dialog-content no-padding">
        <div class="keypad-display">
          <span class="val">{{ input }}</span>
          <span class="unit">{{ unit }}</span>
        </div>
        <table class="keypad-table">
        <tbody>
          <tr>
            <td><button class="key-btn" @click="append('7')">7</button></td>
            <td><button class="key-btn" @click="append('8')">8</button></td>
            <td><button class="key-btn" @click="append('9')">9</button></td>
            <td><button class="key-btn unit-btn" @click="submitWithUnit(units[0].factor)">{{ units[0].label }}</button></td>
          </tr>
          <tr>
            <td><button class="key-btn" @click="append('4')">4</button></td>
            <td><button class="key-btn" @click="append('5')">5</button></td>
            <td><button class="key-btn" @click="append('6')">6</button></td>
            <td><button class="key-btn unit-btn" @click="submitWithUnit(units[1].factor)">{{ units[1].label }}</button></td>
          </tr>
          <tr>
            <td><button class="key-btn" @click="append('1')">1</button></td>
            <td><button class="key-btn" @click="append('2')">2</button></td>
            <td><button class="key-btn" @click="append('3')">3</button></td>
            <td><button class="key-btn unit-btn" @click="submitWithUnit(units[2].factor)">{{ units[2].label }}</button></td>
          </tr>
          <tr>
            <td><button class="key-btn" @click="append('0')">0</button></td>
            <td><button class="key-btn" @click="append('.')">.</button></td>
            <td><button class="key-btn" @click="backspace">&#x232B;</button></td>
            <td><button class="key-btn unit-btn" @click="submitWithUnit(units[3].factor)">{{ units[3].label }}</button></td>
          </tr>
        </tbody>
      </table>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-primary" @click="$emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.keypad-dialog {
  width: 100%;
  max-width: 480px;
}

.no-padding {
  padding: 0 !important;
}

.keypad-display {
  font-size: 32px;
  text-align: right;
  font-weight: bold;
  padding: 20px 16px;
  background: var(--surface-color);
}

.keypad-display .unit {
  font-size: 16px;
  color: var(--text-dim);
  margin-left: 8px;
}

.keypad-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

.keypad-table td {
  padding: 0;
}

.key-btn {
  width: 100%;
  height: 80px;
  border: 1px solid #ddd;
  background: #efefef;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
}

.key-btn:hover {
  background: #e0e0e0;
}

.unit-btn {
  background: #f5f5f5;
  color: var(--primary);
  font-weight: 500;
}
</style>
