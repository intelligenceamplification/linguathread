"""A delayed output seek must not substitute a neighboring sound for the target."""
import importlib.util
import math
from pathlib import Path
import struct
import tempfile
import unittest
import wave
import imageio_ffmpeg

spec=importlib.util.spec_from_file_location("native_extract",Path(__file__).resolve().parents[1]/"scripts/extract-native-word-candidates.py")
extract=importlib.util.module_from_spec(spec);spec.loader.exec_module(extract)
spec=importlib.util.spec_from_file_location("carrier",Path(__file__).resolve().parents[1]/"scripts/extract-checked-carrier-words.py")
carrier=importlib.util.module_from_spec(spec);spec.loader.exec_module(carrier)
spec=importlib.util.spec_from_file_location("quality",Path(__file__).resolve().parents[1]/"scripts/audit-voice-audio.py")
quality=importlib.util.module_from_spec(spec);spec.loader.exec_module(quality)

class WordBoundary(unittest.TestCase):
    def test_target_only_extraction_needs_unique_exact_unprompted_words(self):
        check={'transcript':'Escuche esta palabra. Llevo.','flags':['text-mismatch']}
        index=lambda target:carrier.heard_target_index(check,target,quality.normalize,'es')
        self.assertEqual(index('Llevo'),3)
        self.assertIsNone(index('corregir'))
        check['flags'].append('uncertain-speech');self.assertIsNone(index('Llevo'))
        check.update(flags=['text-mismatch'],transcript='Llevo, llevo.');self.assertIsNone(index('Llevo'))
        check['transcript']='si';self.assertIsNone(index('sí'))
    def test_only_middle_sound_survives_with_expected_silent_padding(self):
        with tempfile.TemporaryDirectory() as folder:
            source=Path(folder)/'parent.wav';destination=Path(folder)/'word.wav';rate=48000
            samples=[int(12000*math.sin(2*math.pi*(300 if n<rate*.3 else 600 if n<rate*.6 else 900)*n/rate)) for n in range(int(rate*.9))]
            with wave.open(str(source),'wb') as output:
                output.setparams((1,2,rate,0,'NONE','not compressed'));output.writeframes(struct.pack('<'+'h'*len(samples),*samples))
            extract.crop_checked_audio(imageio_ffmpeg.get_ffmpeg_exe(),source,destination,.3,.6)
            with wave.open(str(destination),'rb') as output:
                self.assertEqual(output.getnchannels(),1);self.assertEqual(output.getframerate(),rate)
                result=struct.unpack('<'+'h'*output.getnframes(),output.readframes(output.getnframes()))
            self.assertAlmostEqual(len(result)/rate,.54,places=3)
            self.assertEqual(max(abs(n) for n in result[:int(rate*.11)]),0)
            middle=result[int(rate*.15):int(rate*.39)]
            power=lambda frequency: abs(sum(value*complex(math.cos(2*math.pi*frequency*n/rate),math.sin(2*math.pi*frequency*n/rate)) for n,value in enumerate(middle)))
            self.assertGreater(power(600),100*max(power(300),power(900)))

if __name__=='__main__':unittest.main()
