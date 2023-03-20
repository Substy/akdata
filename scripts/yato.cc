#include <iostream>
#include <math.h>
#include "cstdlib"

using namespace std;

class AttackInterval
{
    public:
        const int FRAME_PER_SECOND = 30;
        const float MIN_ANIM_SCALE = 0.1f;

        bool reset_cd;
        bool rely_on_atk_speed;
        float atk_interval;
        float anim_length;
        float max_anim_scale;
        float event_time;

        //传入参数从前往后依次为：理论攻击间隔（秒），动画长度（秒），动画最大拉伸比例（-1为无限拉伸），攻击事件所在时间（秒），重置冷却策略（除山/重岳/迷迭香普攻这种特殊的为0，其它一般情况下为1），动画播放速度（除黄昏这种特殊的例外，一般为1.0），攻击是否依赖攻速
        AttackInterval (float IntervalOrCooldown, float animLength, float maxAnimScale = -1.0f, float eventTime = 0.0f, bool resetCd = 1, float playSpeed = 1.0f, bool relyOnAtkSpeed = 1);
        
        float CalculateRealScale (bool print = 0);
        int CalculatePredelayFrame (bool print = 0);
        int CalculatePostdelayFrame (bool print = 0);
        int CalculateRealDurationInFrame (bool print = 0);
        float CalculateCooldownInFrame (bool print = 0);
        int CalculateRealIntervalInFrame (bool print = 0);
        void CalculateAndPrintAll ();
        
    private:
        float scale = -1.0f;
        int predelay = -1;
        int postdelay = -1;
        int duration = -1;
        float cooldown = -1.0f;
        float interval = -1.0f;

};

AttackInterval::AttackInterval (float IntervalOrCooldown, float animLength, float maxAnimScale, float eventTime, bool resetCd, float playSpeed, bool relyOnAtkSpeed) : reset_cd(resetCd), rely_on_atk_speed(relyOnAtkSpeed), atk_interval(IntervalOrCooldown), anim_length(animLength / playSpeed), max_anim_scale(maxAnimScale), event_time(eventTime / playSpeed)
{
    
}

float AttackInterval::CalculateRealScale(bool print){
    if (rely_on_atk_speed == 0) {
        scale = 1.0f;
    }else{
        scale = atk_interval/anim_length;
        if (scale < MIN_ANIM_SCALE){
            scale = MIN_ANIM_SCALE;
        }else if (max_anim_scale != -1 && scale > max_anim_scale){
            scale = max_anim_scale;
        }
    }
    if (print) cout<<"scale: "<<scale<<endl;
    return scale;
}

int AttackInterval::CalculatePredelayFrame(bool print){
    if (scale<0) CalculateRealScale();
    predelay = max(1, (int) ceil(event_time*scale*FRAME_PER_SECOND));
    if (print) cout<<"predelay: "<<predelay<<endl;
    return predelay;
}

int AttackInterval::CalculatePostdelayFrame(bool print){
    if (predelay<0) CalculatePredelayFrame();
    postdelay = max(1, (int) round(anim_length*scale*FRAME_PER_SECOND)-predelay);
    if (print) cout<<"postdelay: "<<postdelay<<endl;
    return postdelay;
}

int AttackInterval::CalculateRealDurationInFrame(bool print){
    if (postdelay<0) CalculatePostdelayFrame();
    duration = predelay+postdelay;
    if (print) cout<<"duration: "<<duration<<endl;
    return duration;
}

float AttackInterval::CalculateCooldownInFrame(bool print){
    cooldown = atk_interval*FRAME_PER_SECOND;
    if (print) cout<<"cooldown: "<<cooldown<<endl;
    return cooldown;
}

int AttackInterval::CalculateRealIntervalInFrame(bool print){
    if (cooldown<0) CalculateCooldownInFrame();
    if (duration<0) CalculateRealDurationInFrame();
    int round_cooldown = reset_cd ? round(cooldown) : ceil(cooldown);
    if (duration < round_cooldown) ++round_cooldown;
    interval = max(duration, round_cooldown);
    if (print) cout<<"interval: "<<interval<<endl;
    return interval;
}

void AttackInterval::CalculateAndPrintAll(){
    CalculateRealIntervalInFrame();
    cout<<"scale: "<<scale<<endl; //动画拉伸/缩放倍率
    cout<<"predelay: "<<predelay<<endl; //前摇（帧）
    cout<<"postdelay: "<<postdelay<<endl; //后摇（帧）
    cout<<"real_duration: "<<duration<<endl; //攻击实际持续时间（帧）
    cout<<"cooldown: "<<cooldown<<endl; //攻击能力理论冷却时间（帧）
    cout<<"real_interval: "<<interval<<endl; //实际攻击间隔（帧）
}

int main (int argc, char **argv)
{
    float base_interval = 0.93f;
    float atk_speed = atof(argv[1]);
    cout << "Attack speed: " << atk_speed << endl;
    float atk_interval = 100.0f * base_interval / atk_speed;
    
    AttackInterval yato_12(atk_interval, 30.0f/30.0f, 1.0f, 12.0f/30.0f, 0, 1.0f, 1);
    AttackInterval yato_3_1(atk_interval, 31.0f/30.0f, 1.0f, 19.0f/30.0f, 0, 1.0f, 1);
    AttackInterval yato_3_2(atk_interval, 32.0f/30.0f, 1.0f, 9.0f/30.0f, 0, 1.0f, 1);

    cout << "--- yato 1/2: "; yato_12.CalculateAndPrintAll();
    cout << "--- yato 3-1: "; yato_3_1.CalculateAndPrintAll();
    cout << "--- yato 3-2: "; yato_3_2.CalculateAndPrintAll();

    int yato_12_f = yato_12.CalculateRealIntervalInFrame();
    int yato_3_1_f = yato_3_1.CalculateRealDurationInFrame();
    int yato_3_2_f = yato_3_2.CalculateRealDurationInFrame();
    
    int yato_3_duration = yato_3_1_f + yato_3_2_f;
    
    AttackInterval yato_3(atk_interval, yato_3_duration/30.0f, 1.0f, 0.0f, 0, 1.0f, 0);
    cout << "--- yato 3-merge: "; yato_3.CalculateAndPrintAll();
    int yato_3_f = yato_3.CalculateRealIntervalInFrame();
    
    cout<<"1st and 2nd atk interval: "<< yato_12_f <<endl;
    cout<<"3rd atk interval: "<< yato_3_f <<endl;
    cout<<"12 loop length: "<< 2 * yato_12_f <<endl;
    cout<<"full loop length: "<< 2 * yato_12_f + yato_3_f <<endl;
    return 0;
}
