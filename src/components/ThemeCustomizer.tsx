import { Moon, Sun, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useThemeStore, themeColors, applyTheme } from "@/hooks/useTheme";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function ThemeCustomizer() {
  const { mode, colorName, setMode, setColor, toggleMode } = useThemeStore();

  // Apply theme on mount and changes
  useEffect(() => {
    applyTheme(mode, colorName);
  }, [mode, colorName]);

  const handleColorChange = (name: string) => {
    setColor(name);
  };

  const colorObj = themeColors.find((c) => c.name === colorName) || themeColors[0];

  return (
    <div className="flex items-center gap-1">
      {/* Dark mode toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMode}
        className="h-9 w-9"
        title={mode === "dark" ? "Mode clair" : "Mode sombre"}
      >
        {mode === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      {/* Color picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" title="Couleur du thème">
            <div
              className="h-5 w-5 rounded-full border-2 border-muted-foreground/30"
              style={{
                backgroundColor: `hsl(${colorObj.hue} ${colorObj.saturation}% 50%)`,
              }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Couleur du thème</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {themeColors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => handleColorChange(color.name)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                    colorName === color.name
                      ? "border-foreground scale-110 ring-2 ring-foreground/20"
                      : "border-transparent"
                  )}
                  style={{
                    backgroundColor: `hsl(${color.hue} ${color.saturation}% 50%)`,
                  }}
                  title={color.label}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {colorObj.label}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
