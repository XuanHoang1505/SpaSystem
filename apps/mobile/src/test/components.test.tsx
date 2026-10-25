import { render, screen, fireEvent } from '@testing-library/react-native';
import { AppScreen } from '@components/common/AppScreen';
import { AppText } from '@components/common/AppText';
import { AppButton } from '@components/common/AppButton';
import { AppInput } from '@components/common/AppInput';
import { HomeScreen } from '@/screens/HomeScreen';
jest.mock('@components/common/SystemStatus', () => ({ SystemStatus: () => null }));

test('AppScreen renders children', () => {
  render(
    <AppScreen>
      <AppText>Nội dung</AppText>
    </AppScreen>,
  );
  expect(screen.getByText('Nội dung')).toBeOnTheScreen();
});
test('AppButton calls onPress and respects disabled', () => {
  const onPress = jest.fn();
  const { rerender } = render(<AppButton title="Tiếp tục" onPress={onPress} />);
  fireEvent.press(screen.getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
  rerender(<AppButton title="Tiếp tục" onPress={onPress} disabled />);
  fireEvent.press(screen.getByRole('button'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
test('AppInput shows a validation error', () => {
  render(<AppInput label="Email" error="Email không hợp lệ" />);
  expect(screen.getByText('Email không hợp lệ')).toBeOnTheScreen();
  expect(screen.getByLabelText('Email')).toBeOnTheScreen();
});
test('Home screen clearly identifies foundation', () => {
  render(<HomeScreen />);
  expect(screen.getByText('NHƯ NGUYỆT SPA')).toBeOnTheScreen();
  expect(screen.getByText('Tính năng đang được phát triển')).toBeOnTheScreen();
});
