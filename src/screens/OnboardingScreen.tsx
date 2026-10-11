import { useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  accent: "light" | "dark";
}

const SLIDES: Slide[] = [
  {
    eyebrow: "A CLEARER CLINICAL WORKFLOW",
    title: "Dental notes,\norganized.",
    body: "DentNotes helps dental teams capture, structure, and retrieve clinical notes with less friction.",
    accent: "light",
  },
  {
    eyebrow: "A SIMPLE RHYTHM",
    title: "From chairside\nthought to\nfollow-up.",
    body: "Capture observations, organize by case, and return to a useful summary before the next conversation.",
    accent: "dark",
  },
  {
    eyebrow: "PRIVACY-CONSCIOUS BY DESIGN",
    title: "Thoughtful\nby default.",
    body: "Careful organization and deliberate product decisions keep sensitive clinical details handled with care.",
    accent: "light",
  },
];

interface Props {
  onFinish: () => void;
}

export default function OnboardingScreen({ onFinish }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  }

  function goToSlide(index: number) {
    scrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentIndex(index);
  }

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      onFinish();
    }
  }

  return (
    <View className="flex-1 bg-[#f5eef8]">
      <StatusBar style="dark" />

      {/* Skip button (top-right) */}
      <SafeAreaView edges={["top"]} className="absolute inset-x-0 top-0 z-10">
        <View className="flex-row justify-end px-6 pt-4">
          {currentIndex < SLIDES.length - 1 ? (
            <Pressable
              onPress={onFinish}
              className="rounded-full bg-white/70 px-4 py-2"
            >
              <Text className="text-xs font-bold text-purple-800">Skip</Text>
            </Pressable>
          ) : (
            <View className="h-9" />
          )}
        </View>
      </SafeAreaView>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, index) => (
          <View
            key={index}
            style={{ width: SCREEN_WIDTH }}
            className="flex-1 px-6"
          >
            {/* Content */}
            <SafeAreaView
              edges={["top"]}
              className="flex-1 justify-between pb-6 pt-20"
            >
              <View>
                {/* Eyebrow pill */}
                <View className="mb-4 self-start rounded-full bg-white/80 px-3 py-1.5">
                  <View className="flex-row items-center gap-2">
                    <View className="h-1.5 w-1.5 rounded-full bg-purple-700" />
                    <Text className="text-[9px] font-bold uppercase tracking-widest text-purple-800">
                      {slide.eyebrow}
                    </Text>
                  </View>
                </View>

                {/* Title */}
                <Text
                  className={`text-[36px] font-extrabold leading-[42px] tracking-tight ${
                    slide.accent === "dark"
                      ? "text-purple-950"
                      : "text-slate-950"
                  }`}
                >
                  {slide.title}
                </Text>

                {/* Body */}
                <Text className="mt-4 text-sm leading-6 text-slate-600">
                  {slide.body}
                </Text>
              </View>

              {/* Slide 1 visual — stacked cards */}
              {index === 0 && (
                <View className="mb-4 mt-8 items-center">
                  <View className="w-full">
                    <View className="h-6 w-[60%] self-center rounded-t-3xl bg-purple-950" />
                    <View className="-mt-2 h-8 w-[75%] self-center rounded-t-3xl bg-purple-800" />
                    <View className="-mt-2 h-10 w-[90%] self-center rounded-t-3xl bg-purple-600" />
                    <View className="-mt-3 h-24 w-full rounded-3xl bg-white shadow-xl shadow-purple-900/10" />
                  </View>
                </View>
              )}

              {/* Slide 2 visual — 3-step flow */}
              {index === 1 && (
                <View className="mb-4 mt-8 gap-3">
                  {[
                    { num: "01", label: "Capture" },
                    { num: "02", label: "Organize" },
                    { num: "03", label: "Follow up" },
                  ].map((step) => (
                    <View
                      key={step.num}
                      className="flex-row items-center gap-3 rounded-2xl bg-white p-4"
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-purple-700">
                        <Text className="text-[10px] font-bold text-white">
                          {step.num}
                        </Text>
                      </View>
                      <Text className="text-sm font-bold text-slate-900">
                        {step.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Slide 3 visual — shield */}
              {index === 2 && (
                <View className="mb-4 mt-8 items-center">
                  <LinearGradient
                    colors={["#6d28d9", "#4c1d95"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: "100%",
                      height: 180,
                      borderRadius: 28,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View className="h-20 w-20 items-center justify-center rounded-3xl bg-white/20">
                      <Text className="text-4xl">🛡️</Text>
                    </View>
                    <Text className="mt-4 text-sm font-bold text-white">
                      Thoughtful by default
                    </Text>
                    <Text className="mt-1 max-w-[80%] text-center text-xs text-purple-100">
                      Designed to keep clinical context clear and considered.
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </SafeAreaView>
          </View>
        ))}
      </ScrollView>

      {/* Bottom bar: dots + next button */}
      <SafeAreaView edges={["bottom"]}>
        <View className="flex-row items-center justify-between px-6 py-6">
          {/* Dots */}
          <View className="flex-row items-center gap-2">
            {SLIDES.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => goToSlide(i)}
                className={`h-2 rounded-full ${
                  i === currentIndex
                    ? "w-8 bg-purple-800"
                    : "w-2 bg-purple-300"
                }`}
              />
            ))}
          </View>

          {/* Next / Get started */}
          <Pressable
            onPress={handleNext}
            className="flex-row items-center gap-2 rounded-full bg-purple-900 px-6 py-3.5 shadow-lg shadow-purple-900/20 active:opacity-80"
          >
            <Text className="text-sm font-bold text-white">
              {currentIndex === SLIDES.length - 1 ? "Get started" : "Next"}
            </Text>
            <Text className="text-base text-white">→</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}