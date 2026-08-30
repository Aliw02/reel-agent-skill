"""
AI Reel Editor — V3 Acceptance Test Suite
Generates multi-scenario edit plans verifying:
- Test A: Layered hook with typography behind subject
- Test B: Numeric / Price comparison animated StatPip scene
- Test C: Glitch-slice transition & zoom cuts
- Test D: Restrained camera tracking & RTL Arabic kinetic captions
- Test E: Screen demo crop & focus
Renders the result with Remotion and validates with QC.
"""

import os
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import json
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from director import create_multimodal_edit_plan
from validate_plan import validate_plan_file
from qc import run_quality_control

def run_acceptance_test():
    temp_dir = os.path.join(PROJECT_ROOT, ".temp")
    os.makedirs(temp_dir, exist_ok=True)
    public_dir = os.path.join(PROJECT_ROOT, "public")
    os.makedirs(public_dir, exist_ok=True)
    
    test_plan_path = os.path.join(temp_dir, "v3_acceptance_plan.json")
    output_video = os.path.join(PROJECT_ROOT, "output", "v3_acceptance_reel.mp4")
    
    # Rich test transcript containing hooks, numbers, comparisons, and punchlines
    sample_transcript = {
        "language": "ar",
        "duration": 12.0,
        "fps": 60,
        "subtitles": [
            {
                "id": 1,
                "start": 0.0,
                "end": 2.5,
                "startFrame": 0,
                "endFrame": 150,
                "text": "سر مضاعفة أرباحك بالذكاء الاصطناعي 🚀",
                "emoji": "🚀",
                "emphasisLevel": "high",
                "hasKeyword": True,
                "words": [
                    {"word": "سر", "start": 0.0, "end": 0.4, "startFrame": 0, "endFrame": 24, "highlight": True, "role": "keyword"},
                    {"word": "مضاعفة", "start": 0.4, "end": 0.9, "startFrame": 24, "endFrame": 54, "highlight": True, "role": "keyword"},
                    {"word": "أرباحك", "start": 0.9, "end": 1.5, "startFrame": 54, "endFrame": 90, "highlight": True, "role": "keyword"},
                    {"word": "بالذكاء", "start": 1.5, "end": 2.0, "startFrame": 90, "endFrame": 120, "highlight": False, "role": "normal"},
                    {"word": "الاصطناعي", "start": 2.0, "end": 2.5, "startFrame": 120, "endFrame": 150, "highlight": True, "role": "keyword"}
                ]
            },
            {
                "id": 2,
                "start": 2.5,
                "end": 6.5,
                "startFrame": 150,
                "endFrame": 390,
                "text": "وفرنا أكثر من 85% من تكلفة الإنتاج والوقت",
                "emoji": "💰",
                "emphasisLevel": "punchline",
                "hasNumeric": True,
                "words": [
                    {"word": "وفرنا", "start": 2.5, "end": 3.2, "startFrame": 150, "endFrame": 192, "highlight": False, "role": "normal"},
                    {"word": "أكثر", "start": 3.2, "end": 3.7, "startFrame": 192, "endFrame": 222, "highlight": False, "role": "normal"},
                    {"word": "من", "start": 3.7, "end": 4.0, "startFrame": 222, "endFrame": 240, "highlight": False, "role": "normal"},
                    {"word": "85%", "start": 4.0, "end": 4.8, "startFrame": 240, "endFrame": 288, "highlight": True, "role": "numeric"},
                    {"word": "من", "start": 4.8, "end": 5.1, "startFrame": 288, "endFrame": 306, "highlight": False, "role": "normal"},
                    {"word": "تكلفة", "start": 5.1, "end": 5.7, "startFrame": 306, "endFrame": 342, "highlight": False, "role": "normal"},
                    {"word": "الإنتاج", "start": 5.7, "end": 6.5, "startFrame": 342, "endFrame": 390, "highlight": True, "role": "keyword"}
                ]
            },
            {
                "id": 3,
                "start": 6.5,
                "end": 9.5,
                "startFrame": 390,
                "endFrame": 570,
                "text": "الفرق بين المونتاج التقليدي والذكاء الاصطناعي",
                "emoji": "⚡",
                "emphasisLevel": "high",
                "words": [
                    {"word": "الفرق", "start": 6.5, "end": 7.1, "startFrame": 390, "endFrame": 426, "highlight": True, "role": "keyword"},
                    {"word": "بين", "start": 7.1, "end": 7.5, "startFrame": 426, "endFrame": 450, "highlight": False, "role": "normal"},
                    {"word": "المونتاج", "start": 7.5, "end": 8.1, "startFrame": 450, "endFrame": 486, "highlight": False, "role": "normal"},
                    {"word": "التقليدي", "start": 8.1, "end": 8.8, "startFrame": 486, "endFrame": 528, "highlight": False, "role": "normal"},
                    {"word": "والذكاء", "start": 8.8, "end": 9.5, "startFrame": 528, "endFrame": 570, "highlight": True, "role": "keyword"}
                ]
            },
            {
                "id": 4,
                "start": 9.5,
                "end": 12.0,
                "startFrame": 570,
                "endFrame": 720,
                "text": "ابدأ الآن وطور محتواك باحترافية كاملة",
                "emoji": "🎯",
                "emphasisLevel": "high",
                "words": [
                    {"word": "ابدأ", "start": 9.5, "end": 10.0, "startFrame": 570, "endFrame": 600, "highlight": True, "role": "keyword"},
                    {"word": "الآن", "start": 10.0, "end": 10.5, "startFrame": 600, "endFrame": 630, "highlight": True, "role": "keyword"},
                    {"word": "وطور", "start": 10.5, "end": 11.0, "startFrame": 630, "endFrame": 660, "highlight": False, "role": "normal"},
                    {"word": "محتواك", "start": 11.0, "end": 11.5, "startFrame": 660, "endFrame": 690, "highlight": False, "role": "normal"},
                    {"word": "باحترافية", "start": 11.5, "end": 12.0, "startFrame": 690, "endFrame": 720, "highlight": True, "role": "keyword"}
                ]
            }
        ]
    }
    
    print("\n🎯 [Acceptance Test] Generating Multimodal AI Director V3 edit plan...")
    plan, trace = create_multimodal_edit_plan(
        transcript_data=sample_transcript,
        custom_title="سر مضاعفة الأرباح بالذكاء الاصطناعي",
        caption_theme="box_glass",
        style_preset="modern_tech",
        fps=60
    )
    
    with open(test_plan_path, "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=2)
        
    print(f"✅ Generated {len(plan['scenes'])} scenes with {len(plan['transitions'])} transitions.")
    for s in plan["scenes"]:
        print(f"  • Scene [{s['startFrame']}-{s['endFrame']}]: Layout={s['layout']}, Intent={s.get('intent')}, Reason={s.get('reason')}")
        
    # Validate plan
    validate_plan_file(test_plan_path, project_root=PROJECT_ROOT)
    
    # Render with Remotion
    print("\n🚀 [Acceptance Test] Rendering V3 Acceptance Reel (1080x1920 60FPS)...")
    npx_bin = "npx.cmd" if sys.platform == "win32" else "npx"
    render_cmd = [
        npx_bin, "remotion", "render",
        "src/index.ts",
        "ReelComposition",
        os.path.abspath(output_video),
        f"--props={test_plan_path}",
        "--gl=angle"
    ]
    subprocess.run(render_cmd, cwd=PROJECT_ROOT, check=True, shell=sys.platform == "win32")
    
    # Run Master QC
    print("\n🔍 [Acceptance Test] Running Master Quality Control...")
    passed, qc_report = run_quality_control(
        video_path=output_video,
        edit_plan_path=test_plan_path,
        expected_fps=60
    )
    
    print("\n" + "=" * 65)
    print("🏆 Acceptance Test Result: " + ("PASSED ✅" if passed else "FAILED ❌"))
    print(f"🎬 Video Output: {os.path.abspath(output_video)}")
    print("=" * 65)
    return passed

if __name__ == "__main__":
    success = run_acceptance_test()
    sys.exit(0 if success else 1)
