#!/usr/bin/env python3

from PIL import Image, ImageDraw, ImageFont
import os

# Create a 200x200 square logo for MobiCycle Posts
def create_logo():
    # Create a new image with a blue background
    size = (200, 200)
    background_color = (0, 119, 181)  # LinkedIn blue
    img = Image.new('RGB', size, background_color)
    
    # Create a drawing context
    draw = ImageDraw.Draw(img)
    
    # Add white circle background
    circle_margin = 20
    circle_coords = [circle_margin, circle_margin, size[0]-circle_margin, size[1]-circle_margin]
    draw.ellipse(circle_coords, fill='white')
    
    # Try to use default font, fallback if not available
    try:
        # Try to use a larger font
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
    except:
        # Fallback to default font
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Add text
    text1 = "MC"
    text2 = "Posts"
    
    # Get text size and position for centering
    bbox1 = draw.textbbox((0, 0), text1, font=font_large)
    bbox2 = draw.textbbox((0, 0), text2, font=font_small)
    
    text1_width = bbox1[2] - bbox1[0]
    text1_height = bbox1[3] - bbox1[1]
    text2_width = bbox2[2] - bbox2[0]
    text2_height = bbox2[3] - bbox2[1]
    
    # Center the text
    x1 = (size[0] - text1_width) // 2
    y1 = (size[1] - text1_height - text2_height) // 2
    x2 = (size[0] - text2_width) // 2
    y2 = y1 + text1_height + 5
    
    # Draw text
    draw.text((x1, y1), text1, fill='#0077B5', font=font_large)
    draw.text((x2, y2), text2, fill='#0077B5', font=font_small)
    
    # Save the image
    logo_path = '/Users/mobicycle/Desktop/api/linkedin/mobicycle-posts-logo.png'
    img.save(logo_path)
    print(f"✅ Logo created: {logo_path}")
    return logo_path

if __name__ == "__main__":
    create_logo()