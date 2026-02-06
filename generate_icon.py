import matplotlib.pyplot as plt
import numpy as np

def draw_smith_chart(filename, size_px=800):
    # Base size calculation (assuming 800x800 was the reference for linewidths)
    # The original script used figsize=(8, 8) with dpi=100 -> 800x800 px
    
    dpi = 100
    figsize = (size_px / dpi, size_px / dpi)
    scale = size_px / 800.0

    fig, ax = plt.subplots(figsize=figsize, dpi=dpi)
    ax.set_aspect('equal')

    # Constants
    # Resistance circles (r = const)
    r_values = [0.2, 0.5, 1.0, 2.0, 5.0]
    # Reactance circles (x = const)
    x_values = [0.2, 0.5, 1.0, 2.0, 5.0]

    lw_frame = 16 * scale
    lw_grid = 8 * scale

    # Draw the outer circle (r = 0)
    # Fill with white background inside the chart
    outer_circle = plt.Circle((0, 0), 1, fill=True, facecolor='white', edgecolor='black', linewidth=lw_frame, zorder=1)
    ax.add_artist(outer_circle)

    # Draw resistance circles (draw on top of white background)
    # Center: (r / (r + 1), 0), Radius: 1 / (r + 1)
    for r in r_values:
        center = (r / (r + 1), 0)
        radius = 1 / (r + 1)
        circle = plt.Circle(center, radius, fill=False, color='black', linewidth=lw_grid, alpha=0.8, zorder=2)
        ax.add_artist(circle)

    # Draw reactance circles
    # Center: (1, 1 / x), Radius: 1 / x
    for x in x_values:
        # Positive x
        center = (1, 1 / x)
        radius = 1 / x
        circle_p = plt.Circle(center, radius, fill=False, color='black', linewidth=lw_grid, alpha=0.8, zorder=2)
        ax.add_artist(circle_p)
        
        # Negative x
        center_n = (1, -1 / x)
        circle_n = plt.Circle(center_n, radius, fill=False, color='black', linewidth=lw_grid, alpha=0.8, zorder=2)
        ax.add_artist(circle_n)

    # Horizontal axis (x = 0)
    ax.plot([-1, 1], [0, 0], color='black', linewidth=lw_grid, alpha=0.8, zorder=2)

    # Set limits and remove axes
    ax.set_xlim(-1.1, 1.1)
    ax.set_ylim(-1.1, 1.1)
    ax.axis('off')

    # Clipping to the unit circle
    from matplotlib.patches import Circle
    clip_circle = Circle((0, 0), 1, transform=ax.transData)
    for artist in ax.get_children():
        if isinstance(artist, (plt.Line2D, plt.Circle)):
            artist.set_clip_path(clip_circle)

    plt.savefig(filename, bbox_inches='tight', pad_inches=0, transparent=True,  dpi=dpi)
    plt.close()
    print(f"Generated {filename} ({size_px}x{size_px})")

if __name__ == "__main__":
    draw_smith_chart("public/favicon.svg", size_px=800)
    draw_smith_chart("public/icon-192x192.png", size_px=192)
    draw_smith_chart("public/icon-512x512.png", size_px=512)
